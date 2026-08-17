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
      const rules = await databases.listDocuments({ databaseId, collectionId: "commission_rules", queries: [Query.equal("status", "active"), Query.orderDesc("effectiveFrom"), Query.limit(1)], transactionId: transaction.$id });
      const gross = Number(vendorOrder.subtotalMinor), commission = Math.round(gross * Number(rules.documents[0]?.rateBasisPoints ?? 1000) / 10_000);
      await databases.createDocument({ databaseId, collectionId: "refunds", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { refundNumber: `PAC-REF-${new Date().getUTCFullYear()}-${ID.unique().slice(-10).toUpperCase()}`, returnRequestId: request.$id, orderId: request.orderId, vendorOrderId: request.vendorOrderId, customerUserId: request.customerUserId, vendorId: request.vendorId, amountMinor: gross, currency: vendorOrder.currency, status: "processed", provider: "simulated", createdAt: now, processedAt: now } });
      await databases.updateDocument({ databaseId, collectionId: "return_requests", documentId: request.$id, data: { status: "refunded", reviewedAt: now, ...(input.notes ? { reviewNotes: input.notes } : {}) }, transactionId: transaction.$id });
      await databases.updateDocument({ databaseId, collectionId: "vendor_orders", documentId: vendorOrder.$id, data: { status: "returned" }, transactionId: transaction.$id });
      await postRefundJournal(databases, databaseId, transaction.$id, { returnRequestId: request.$id, vendorId: String(request.vendorId), gross, commission, currency: String(vendorOrder.currency) });
    }
    await databases.createDocument({ databaseId, collectionId: "order_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId: request.orderId, vendorOrderId: request.vendorOrderId, eventType: `return_${input.action === "approve" ? "refunded" : "rejected"}`, actorUserId: input.actorUserId, metadata: JSON.stringify({ notes: input.notes }), occurredAt: now } });
    await databases.createDocument({ databaseId, collectionId: "audit_logs", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { actorUserId: input.actorUserId, action: `return.${input.action}`, entityType: "return_request", entityId: request.$id, metadata: JSON.stringify({ vendorOrderId: request.vendorOrderId }), occurredAt: now } });
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) { await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
}
