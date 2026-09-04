import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { postPaymentJournal } from "@/src/modules/finance/server/journals";
import { publishAdminNotificationSafely } from "@/src/modules/admin-notifications/server/publisher";
import { publishLowStockAlerts } from "@/src/modules/inventory/server/integrity";
import { reservationsCoverStandardItems } from "@/src/modules/inventory/domain/reservation";

const nextPaymentNumber = () => `PAC-PAY-${new Date().getUTCFullYear()}-${ID.unique().slice(-10).toUpperCase()}`;

export async function captureVerifiedPayment(userId: string, orderId: string, provider: "demo" | "paystack" | "papss", providerReference: string) {
  const databases = createAppwriteDatabaseClient().databases;
  const databaseId = env().APPWRITE_DATABASE_ID;
  const order = await databases.getDocument({ databaseId, collectionId: "orders", documentId: orderId });
  if (String(order.customerUserId) !== userId) throw new Error("Order not found");
  const existing = await databases.listDocuments({ databaseId, collectionId: "payments", queries: [Query.equal("orderId", orderId), Query.limit(1)] });
  if (existing.documents[0]?.status === "captured") return { orderId, paymentId: existing.documents[0].$id };
  if (String(order.status) !== "pending_payment") throw new Error("Order is not payable");
  if (Date.now() - new Date(String(order.createdAt)).getTime() >= 900_000) throw new Error("Order reservation expired");

  const transaction = await databases.createTransaction({ ttl: 120 });
  const affectedBalanceIds: string[] = [];
  try {
    const [reservations,items] = await Promise.all([databases.listDocuments({ databaseId, collectionId: "inventory_reservations", queries: [Query.equal("orderId", orderId), Query.equal("status", "active"), Query.limit(500)], transactionId: transaction.$id }),databases.listDocuments({databaseId,collectionId:"order_items",queries:[Query.equal("orderId",orderId),Query.limit(500)],transactionId:transaction.$id})]);
    const reservedByOffer=new Map<string,number>();for(const reservation of reservations.documents)reservedByOffer.set(String(reservation.offerId),(reservedByOffer.get(String(reservation.offerId))??0)+Number(reservation.quantity));
    if(!reservationsCoverStandardItems(items.documents.map(item=>({offerId:String(item.offerId),quantity:Number(item.quantity),purchaseType:String(item.purchaseType??"standard")})),reservedByOffer))throw new Error("No active inventory reservation for a standard item");
    for (const reservation of reservations.documents) {
      const balances = await databases.listDocuments({ databaseId, collectionId: "inventory_balances", queries: [Query.equal("offerId", String(reservation.offerId)), Query.equal("warehouseId", String(reservation.warehouseId)), Query.limit(1)], transactionId: transaction.$id });
      const balance = balances.documents[0];
      if (!balance) throw new Error("Reserved stock balance no longer exists");
      affectedBalanceIds.push(balance.$id);
      const quantity = Number(reservation.quantity);
      await databases.decrementDocumentAttribute({ databaseId, collectionId: "inventory_balances", documentId: balance.$id, attribute: "onHand", value: quantity, min: 0, transactionId: transaction.$id });
      await databases.decrementDocumentAttribute({ databaseId, collectionId: "inventory_balances", documentId: balance.$id, attribute: "reserved", value: quantity, min: 0, transactionId: transaction.$id });
      await databases.updateDocument({ databaseId, collectionId: "inventory_reservations", documentId: reservation.$id, data: { status: "captured" }, transactionId: transaction.$id });
      await databases.createDocument({ databaseId, collectionId: "inventory_movements", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { vendorId: reservation.vendorId, warehouseId: reservation.warehouseId, offerId: reservation.offerId, type: "sale", quantity: -quantity, referenceType: "order", referenceId: orderId, actorUserId: userId, occurredAt: new Date().toISOString() } });
    }
    const capturedAt = new Date().toISOString();
    const payment = await databases.createDocument({ databaseId, collectionId: "payments", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { paymentNumber: nextPaymentNumber(), orderId, customerUserId: userId, provider, idempotencyKey: `${provider}:${providerReference}`, amountMinor: order.totalMinor, currency: order.currency, status: "captured", createdAt: capturedAt, capturedAt } });
    await postPaymentJournal(databases, databaseId, transaction.$id, payment.$id, Number(order.totalMinor), Number(order.subtotalMinor), String(order.currency));
    await databases.updateDocument({ databaseId, collectionId: "orders", documentId: orderId, data: { status: "paid" }, transactionId: transaction.$id });
    await databases.createDocument({ databaseId, collectionId: "order_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId, eventType: "payment_confirmed", actorUserId: userId, metadata: JSON.stringify({ paymentId: payment.$id, provider, providerReference }), occurredAt: capturedAt } });
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
    await publishLowStockAlerts(affectedBalanceIds);
    await publishAdminNotificationSafely({eventType:"payment_captured",priority:"action",title:"Payment captured — fulfilment required",body:`${order.currency} ${(Number(order.totalMinor)/100).toLocaleString()} was captured for order ${orderId}.`,entityType:"order",entityId:orderId,href:`/admin/orders?orderId=${orderId}`,roles:["finance_officer","order_fulfilment_manager"]});
    return { orderId, paymentId: payment.$id };
  } catch (error) {
    await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    const completed = await databases.listDocuments({ databaseId, collectionId: "payments", queries: [Query.equal("orderId", orderId), Query.equal("status", "captured"), Query.limit(1)] }).catch(() => undefined);
    if (completed?.documents[0]) return { orderId, paymentId: completed.documents[0].$id };
    throw error;
  }
}

export function captureSimulatedPayment(userId: string, orderId: string) {
  return captureVerifiedPayment(userId, orderId, "demo", orderId);
}
