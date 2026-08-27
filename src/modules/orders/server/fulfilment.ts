import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { canTransitionVendorOrder } from "@/src/modules/orders/domain/status";
import { postDeliveryJournal } from "@/src/modules/finance/server/journals";
import { publishAdminNotificationSafely } from "@/src/modules/admin-notifications/server/publisher";

export async function transitionVendorOrder(input: { vendorId: string; vendorOrderId: string; actorUserId: string; nextStatus: string; carrier?: string; trackingNumber?: string; trackingUrl?: string }) {
  const databases = createAppwriteDatabaseClient().databases;
  const databaseId = env().APPWRITE_DATABASE_ID;
  const vendorOrder = await databases.getDocument({ databaseId, collectionId: "vendor_orders", documentId: input.vendorOrderId });
  if (String(vendorOrder.vendorId) !== input.vendorId) throw new Error("Order not found");
  if (!canTransitionVendorOrder(String(vendorOrder.status), input.nextStatus)) throw new Error("Invalid order transition");
  if (input.nextStatus === "dispatched" && (!input.carrier?.trim() || !input.trackingNumber?.trim())) throw new Error("Carrier and tracking number are required");
  const transaction = await databases.createTransaction({ ttl: 120 });
  try {
    const occurredAt = new Date().toISOString();
    await databases.updateDocument({ databaseId, collectionId: "vendor_orders", documentId: input.vendorOrderId, data: { status: input.nextStatus }, transactionId: transaction.$id });
    if (input.nextStatus === "dispatched") {
      await databases.createDocument({ databaseId, collectionId: "shipments", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId: vendorOrder.orderId, vendorOrderId: input.vendorOrderId, vendorId: input.vendorId, carrier: input.carrier!.trim(), trackingNumber: input.trackingNumber!.trim(), ...(input.trackingUrl?.trim() ? { trackingUrl: input.trackingUrl.trim() } : {}), status: "in_transit", dispatchedAt: occurredAt, updatedAt: occurredAt } });
    }
    if (input.nextStatus === "delivered") {
      const shipments = await databases.listDocuments({ databaseId, collectionId: "shipments", queries: [Query.equal("vendorOrderId", input.vendorOrderId), Query.limit(1)], transactionId: transaction.$id });
      if (!shipments.documents[0]) throw new Error("Shipment not found");
      await databases.updateDocument({ databaseId, collectionId: "shipments", documentId: shipments.documents[0].$id, data: { status: "delivered", deliveredAt: occurredAt, updatedAt: occurredAt }, transactionId: transaction.$id });
      await postDeliveryJournal(databases, databaseId, transaction.$id, vendorOrder);
    }
    await databases.createDocument({ databaseId, collectionId: "order_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId: vendorOrder.orderId, vendorOrderId: input.vendorOrderId, eventType: `vendor_order_${input.nextStatus}`, actorUserId: input.actorUserId, metadata: JSON.stringify(input.nextStatus === "dispatched" ? { carrier: input.carrier, trackingNumber: input.trackingNumber } : {}), occurredAt } });
    const siblings = await databases.listDocuments({ databaseId, collectionId: "vendor_orders", queries: [Query.equal("orderId", String(vendorOrder.orderId)), Query.limit(100)], transactionId: transaction.$id });
    if (siblings.documents.every(order => order.$id === input.vendorOrderId ? input.nextStatus === "delivered" : String(order.status) === "delivered")) await databases.updateDocument({ databaseId, collectionId: "orders", documentId: String(vendorOrder.orderId), data: { status: "delivered" }, transactionId: transaction.$id });
    else if (input.nextStatus === "dispatched") await databases.updateDocument({ databaseId, collectionId: "orders", documentId: String(vendorOrder.orderId), data: { status: "in_fulfilment" }, transactionId: transaction.$id });
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
    const event=input.nextStatus==="dispatched"?{eventType:"order_dispatched",priority:"action" as const,title:"Goods dispatched",body:`Vendor order ${input.vendorOrderId} is now in transit.`,roles:["order_fulfilment_manager","logistics_manager","logistics_dispatcher"] as const}:input.nextStatus==="delivered"?{eventType:"order_delivered",priority:"information" as const,title:"Delivery completed",body:`Vendor order ${input.vendorOrderId} was delivered.`,roles:["order_fulfilment_manager","finance_officer"] as const}:{eventType:"order_processing",priority:"action" as const,title:"Fulfilment action required",body:`Vendor order ${input.vendorOrderId} moved to ${input.nextStatus}.`,roles:["order_fulfilment_manager","warehouse_manager"] as const};
    await publishAdminNotificationSafely({...event,entityType:"vendor_order",entityId:input.vendorOrderId,href:`/admin/orders?orderId=${vendorOrder.orderId}`});
  } catch (error) { await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
}

export async function requestReturn(input: { userId: string; orderId: string; vendorOrderId: string; reason: string }) {
  if (input.reason.trim().length < 10) throw new Error("Return reason is too short");
  const databases = createAppwriteDatabaseClient().databases;
  const databaseId = env().APPWRITE_DATABASE_ID;
  const [order, vendorOrder] = await Promise.all([databases.getDocument({ databaseId, collectionId: "orders", documentId: input.orderId }), databases.getDocument({ databaseId, collectionId: "vendor_orders", documentId: input.vendorOrderId })]);
  if (String(order.customerUserId) !== input.userId || String(vendorOrder.orderId) !== input.orderId || String(vendorOrder.status) !== "delivered") throw new Error("Order is not eligible for return");
  const result=await databases.createDocument({ databaseId, collectionId: "return_requests", documentId: ID.unique(), permissions: [], data: { orderId: input.orderId, vendorOrderId: input.vendorOrderId, customerUserId: input.userId, vendorId: vendorOrder.vendorId, reason: input.reason.trim(), status: "requested", requestedAt: new Date().toISOString() } });
  await publishAdminNotificationSafely({eventType:"return_requested",priority:"action",title:"Customer return requested",body:`A return was requested for order ${input.orderId}.`,entityType:"return_request",entityId:result.$id,href:"/admin/returns",roles:["support_officer","order_fulfilment_manager"]});
  return result;
}
