import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { publishAdminNotificationSafely } from "@/src/modules/admin-notifications/server/publisher";

const databaseId = () => env().APPWRITE_DATABASE_ID;

export async function releaseExpiredReservations(actorUserId = "system-inventory") {
  const database = createAppwriteDatabaseClient().databases;
  const now = new Date().toISOString();
  const reservations = await database.listDocuments({ databaseId: databaseId(), collectionId: "inventory_reservations", queries: [Query.equal("status", "active"), Query.lessThanEqual("expiresAt", now), Query.limit(5000)] });
  const orderIds = new Set<string>();
  let releasedUnits = 0;
  for (const reservation of reservations.documents) {
    const transaction = await database.createTransaction({ ttl: 120 });
    try {
      const order = await database.getDocument({ databaseId: databaseId(), collectionId: "orders", documentId: String(reservation.orderId), transactionId: transaction.$id });
      if (String(order.status) !== "pending_payment") {
        await database.updateDocument({ databaseId: databaseId(), collectionId: "inventory_reservations", documentId: reservation.$id, data: { status: "captured" }, transactionId: transaction.$id });
      } else {
        const balances = await database.listDocuments({ databaseId: databaseId(), collectionId: "inventory_balances", queries: [Query.equal("offerId", String(reservation.offerId)), Query.equal("warehouseId", String(reservation.warehouseId)), Query.limit(1)], transactionId: transaction.$id });
        const balance = balances.documents[0];
        if (!balance || Number(balance.reserved) < Number(reservation.quantity)) throw new Error("Reservation balance mismatch");
        await database.decrementDocumentAttribute({ databaseId: databaseId(), collectionId: "inventory_balances", documentId: balance.$id, attribute: "reserved", value: Number(reservation.quantity), min: 0, transactionId: transaction.$id });
        await database.updateDocument({ databaseId: databaseId(), collectionId: "inventory_reservations", documentId: reservation.$id, data: { status: "expired" }, transactionId: transaction.$id });
        releasedUnits += Number(reservation.quantity);
        orderIds.add(String(reservation.orderId));
      }
      await database.updateTransaction({ transactionId: transaction.$id, commit: true });
    } catch (error) { await database.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
  }
  const cutoff = new Date(Date.now() - 900_000).toISOString();
  const staleOrders = await database.listDocuments({ databaseId: databaseId(), collectionId: "orders", queries: [Query.equal("status", "pending_payment"), Query.lessThanEqual("createdAt", cutoff), Query.limit(5000)] });
  for (const order of staleOrders.documents) orderIds.add(order.$id);
  for (const orderId of orderIds) {
    const transaction = await database.createTransaction({ ttl: 120 });
    try {
      const active = await database.listDocuments({ databaseId: databaseId(), collectionId: "inventory_reservations", queries: [Query.equal("orderId", orderId), Query.equal("status", "active"), Query.limit(1)], transactionId: transaction.$id });
      if (!active.documents.length) {
        const items = await database.listDocuments({ databaseId: databaseId(), collectionId: "order_items", queries: [Query.equal("orderId", orderId), Query.limit(500)], transactionId: transaction.$id });
        for (const item of items.documents.filter(item => String(item.purchaseType) === "preorder")) {
          const program = await database.getDocument({ databaseId: databaseId(), collectionId: "product_programs", documentId: String(item.offerId), transactionId: transaction.$id }).catch(() => null);
          if (program && Number(program.preorderReserved) >= Number(item.quantity)) await database.decrementDocumentAttribute({ databaseId: databaseId(), collectionId: "product_programs", documentId: program.$id, attribute: "preorderReserved", value: Number(item.quantity), min: 0, transactionId: transaction.$id });
        }
        await database.updateDocument({ databaseId: databaseId(), collectionId: "orders", documentId: orderId, data: { status: "cancelled" }, transactionId: transaction.$id });
        const vendorOrders = await database.listDocuments({ databaseId: databaseId(), collectionId: "vendor_orders", queries: [Query.equal("orderId", orderId), Query.limit(500)], transactionId: transaction.$id });
        for (const child of vendorOrders.documents) await database.updateDocument({ databaseId: databaseId(), collectionId: "vendor_orders", documentId: child.$id, data: { status: "cancelled" }, transactionId: transaction.$id });
        await database.createDocument({ databaseId: databaseId(), collectionId: "order_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId, eventType: "inventory_reservation_expired", actorUserId, metadata: JSON.stringify({ releasedAt: now }), occurredAt: now } });
      }
      await database.updateTransaction({ transactionId: transaction.$id, commit: true });
    } catch (error) { await database.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
  }
  return { releasedReservations: reservations.total, releasedUnits, cancelledOrders: orderIds.size };
}

export async function publishLowStockAlerts(balanceIds: string[]) {
  const database = createAppwriteDatabaseClient().databases;
  for (const balanceId of [...new Set(balanceIds)]) {
    const balance = await database.getDocument({ databaseId: databaseId(), collectionId: "inventory_balances", documentId: balanceId });
    const available = Number(balance.onHand) - Number(balance.reserved) - Number(balance.damaged), reorderPoint = Number(balance.reorderPoint ?? 0);
    if (reorderPoint > 0 && available <= reorderPoint) await publishAdminNotificationSafely({ eventType: "inventory_low_stock", priority: available <= 0 ? "action" : "information", title: available <= 0 ? "Product out of stock" : "Product stock is low", body: `Offer ${balance.offerId} has ${available} available units; reorder point is ${reorderPoint}.`, entityType: "inventory_balance", entityId: balance.$id, href: "/admin/inventory", roles: ["warehouse_manager", "order_fulfilment_manager"] });
  }
}
