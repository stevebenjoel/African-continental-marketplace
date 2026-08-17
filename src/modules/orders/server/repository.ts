import "server-only";
import { Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
const databaseId = () => env().APPWRITE_DATABASE_ID;
const databases = () => createAppwriteDatabaseClient().databases;
export const listCustomerOrders = (userId: string) => databases().listDocuments({ databaseId: databaseId(), collectionId: "orders", queries: [Query.equal("customerUserId", userId), Query.orderDesc("createdAt"), Query.limit(100)] });
export const listVendorOrders = (vendorId: string) => databases().listDocuments({ databaseId: databaseId(), collectionId: "vendor_orders", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("createdAt"), Query.limit(100)] });

export async function getVendorOrderBundle(vendorId: string, vendorOrderId: string) {
  const db = databases();
  const vendorOrder = await db.getDocument({ databaseId: databaseId(), collectionId: "vendor_orders", documentId: vendorOrderId });
  if (String(vendorOrder.vendorId) !== vendorId) throw new Error("Order not found");
  const [items, shipments, events, returns] = await Promise.all([
    db.listDocuments({ databaseId: databaseId(), collectionId: "order_items", queries: [Query.equal("vendorOrderId", vendorOrderId), Query.limit(100)] }),
    db.listDocuments({ databaseId: databaseId(), collectionId: "shipments", queries: [Query.equal("vendorOrderId", vendorOrderId), Query.limit(1)] }),
    db.listDocuments({ databaseId: databaseId(), collectionId: "order_events", queries: [Query.equal("vendorOrderId", vendorOrderId), Query.orderDesc("occurredAt"), Query.limit(100)] }),
    db.listDocuments({ databaseId: databaseId(), collectionId: "return_requests", queries: [Query.equal("vendorOrderId", vendorOrderId), Query.limit(1)] })
  ]);
  return { vendorOrder, items: items.documents, shipment: shipments.documents[0] ?? null, events: events.documents, returnRequest: returns.documents[0] ?? null };
}
