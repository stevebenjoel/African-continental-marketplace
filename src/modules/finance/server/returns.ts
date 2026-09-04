import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { postRefundJournal } from "@/src/modules/finance/server/journals";

export function listReturnRequests() { return createAppwriteDatabaseClient().databases.listDocuments({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "return_requests", queries: [Query.orderDesc("requestedAt"), Query.limit(100)] }); }

export async function reviewReturn(input: { returnRequestId: string; action: "approve" | "reject"; notes: string; actorUserId: string }) {
  const databases = createAppwriteDatabaseClient().databases;
  const databaseId = env().APPWRITE_DATABASE_ID;
  const request = await databases.getDocument({ databaseId, collectionId: "return_requests", documentId: input.returnRequestId });
  if (String(request.status) !== "requested") throw new Error("Return was already reviewed");
  const vendorOrder = await databases.getDocument({ databaseId, collectionId: "vendor_orders", documentId: String(request.vendorOrderId) });
  const transaction = await databases.createTransaction({ ttl: 120 });
  try {
    const now = new Date().toISOString();
    if (input.action === "reject") await databases.updateDocument({ databaseId, collectionId: "return_requests", documentId: request.$id, data: { status: "rejected", reviewedAt: now, ...(input.notes ? { reviewNotes: input.notes } : {}) }, transactionId: transaction.$id });
    else {
      const allocations = await databases.listDocuments({ databaseId, collectionId: "commission_allocations", queries: [Query.equal("vendorOrderId", vendorOrder.$id), Query.limit(500)], transactionId: transaction.$id });
      const gross = Number(vendorOrder.subtotalMinor);
      let commission: number;
      if (allocations.documents.length) commission = allocations.documents.reduce((sum, allocation) => sum + Number(allocation.pacsmMinor), 0);
      else {
        const rules = await databases.listDocuments({ databaseId, collectionId: "commission_rules", queries: [Query.equal("status", "active"), Query.orderDesc("effectiveFrom"), Query.limit(1)], transactionId: transaction.$id });
        commission = Math.round(gross * Number(rules.documents[0]?.rateBasisPoints ?? 1000) / 10_000);
      }
      await databases.createDocument({ databaseId, collectionId: "refunds", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { refundNumber: `PAC-REF-${new Date().getUTCFullYear()}-${ID.unique().slice(-10).toUpperCase()}`, returnRequestId: request.$id, orderId: request.orderId, vendorOrderId: request.vendorOrderId, customerUserId: request.customerUserId, vendorId: request.vendorId, amountMinor: gross, currency: vendorOrder.currency, status: "processed", provider: "simulated", createdAt: now, processedAt: now } });
      await databases.updateDocument({ databaseId, collectionId: "return_requests", documentId: request.$id, data: { status: "refunded", reviewedAt: now, ...(input.notes ? { reviewNotes: input.notes } : {}) }, transactionId: transaction.$id });
      await databases.updateDocument({ databaseId, collectionId: "vendor_orders", documentId: vendorOrder.$id, data: { status: "returned" }, transactionId: transaction.$id });
      await postRefundJournal(databases, databaseId, transaction.$id, { returnRequestId: request.$id, vendorId: String(request.vendorId), gross, commission, currency: String(vendorOrder.currency) });
      for (const allocation of allocations.documents) await databases.updateDocument({ databaseId, collectionId:"commission_allocations", documentId:allocation.$id, transactionId:transaction.$id, data:{status:"reversed",reversedAt:now} });
    }
    await databases.createDocument({ databaseId, collectionId: "order_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId: request.orderId, vendorOrderId: request.vendorOrderId, eventType: `return_${input.action === "approve" ? "refunded" : "rejected"}`, actorUserId: input.actorUserId, metadata: JSON.stringify({ notes: input.notes }), occurredAt: now } });
    await databases.createDocument({ databaseId, collectionId: "audit_logs", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { actorUserId: input.actorUserId, action: `return.${input.action}`, entityType: "return_request", entityId: request.$id, metadata: JSON.stringify({ vendorOrderId: request.vendorOrderId }), occurredAt: now } });
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) { await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
}

export async function processReturnedInventory(input:{returnRequestId:string;warehouseId:string;disposition:"restock"|"damaged";actorUserId:string}){
  const databases=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID,request=await databases.getDocument({databaseId,collectionId:"return_requests",documentId:input.returnRequestId});
  if(String(request.status)!=="refunded"||request.inventoryProcessedAt)throw new Error("Return is not awaiting inventory inspection");
  const [warehouse,items]=await Promise.all([databases.getDocument({databaseId,collectionId:"warehouses",documentId:input.warehouseId}),databases.listDocuments({databaseId,collectionId:"order_items",queries:[Query.equal("vendorOrderId",String(request.vendorOrderId)),Query.limit(500)]})]);
  if(String(warehouse.vendorId)!==String(request.vendorId)||!items.documents.length)throw new Error("Invalid return warehouse");
  const transaction=await databases.createTransaction({ttl:120});try{const now=new Date().toISOString();for(const item of items.documents){const balances=await databases.listDocuments({databaseId,collectionId:"inventory_balances",queries:[Query.equal("offerId",String(item.offerId)),Query.equal("warehouseId",input.warehouseId),Query.limit(1)],transactionId:transaction.$id});let balance=balances.documents[0];if(!balance)balance=await databases.createDocument({databaseId,collectionId:"inventory_balances",documentId:ID.unique(),permissions:[],transactionId:transaction.$id,data:{vendorId:request.vendorId,warehouseId:input.warehouseId,offerId:item.offerId,onHand:0,reserved:0,incoming:0,damaged:0,version:1,reorderPoint:0}});const quantity=Number(item.quantity);await databases.incrementDocumentAttribute({databaseId,collectionId:"inventory_balances",documentId:balance.$id,attribute:"onHand",value:quantity,transactionId:transaction.$id});if(input.disposition==="damaged")await databases.incrementDocumentAttribute({databaseId,collectionId:"inventory_balances",documentId:balance.$id,attribute:"damaged",value:quantity,transactionId:transaction.$id});await databases.createDocument({databaseId,collectionId:"inventory_movements",documentId:ID.unique(),permissions:[],transactionId:transaction.$id,data:{vendorId:request.vendorId,warehouseId:input.warehouseId,offerId:item.offerId,type:input.disposition==="restock"?"return_restock":"return_damaged",quantity,referenceType:"return_request",referenceId:request.$id,actorUserId:input.actorUserId,occurredAt:now}})}await databases.updateDocument({databaseId,collectionId:"return_requests",documentId:request.$id,transactionId:transaction.$id,data:{status:"completed",inventoryDisposition:input.disposition,dispositionWarehouseId:input.warehouseId,inventoryProcessedAt:now,inventoryProcessedBy:input.actorUserId}});await databases.createDocument({databaseId,collectionId:"audit_logs",documentId:ID.unique(),permissions:[],transactionId:transaction.$id,data:{actorUserId:input.actorUserId,action:`return_inventory.${input.disposition}`,entityType:"return_request",entityId:request.$id,metadata:JSON.stringify({warehouseId:input.warehouseId}),occurredAt:now}});await databases.updateTransaction({transactionId:transaction.$id,commit:true})}catch(error){await databases.updateTransaction({transactionId:transaction.$id,rollback:true}).catch(()=>undefined);throw error}
}
