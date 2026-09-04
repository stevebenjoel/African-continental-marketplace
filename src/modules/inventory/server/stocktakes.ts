import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

const id = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;
export const listStockCounts = (vendorId?: string) => db().listDocuments({ databaseId: id(), collectionId: "inventory_counts", queries: [...(vendorId ? [Query.equal("vendorId", vendorId)] : []), Query.orderDesc("countedAt"), Query.limit(5000)] });

export async function submitStockCount(input: { vendorId: string; balanceId: string; countedQuantity: number; reason: string; actorUserId: string }) {
  if (!Number.isSafeInteger(input.countedQuantity) || input.countedQuantity < 0 || input.reason.trim().length < 10) throw new Error("Invalid count");
  const database = db(), balance = await database.getDocument({ databaseId: id(), collectionId: "inventory_balances", documentId: input.balanceId });
  if (String(balance.vendorId) !== input.vendorId) throw new Error("Inventory not owned");
  return database.createDocument({ databaseId: id(), collectionId: "inventory_counts", documentId: ID.unique(), permissions: [], data: { vendorId: input.vendorId, balanceId: balance.$id, warehouseId: balance.warehouseId, offerId: balance.offerId, expectedQuantity: balance.onHand, countedQuantity: input.countedQuantity, variance: input.countedQuantity - Number(balance.onHand), reason: input.reason.trim(), status: "pending_approval", countedBy: input.actorUserId, countedAt: new Date().toISOString() } });
}

export async function reviewStockCount(countId: string, action: "approve" | "reject", actorUserId: string, notes: string) {
  const database = db(), count = await database.getDocument({ databaseId: id(), collectionId: "inventory_counts", documentId: countId });
  if (String(count.status) !== "pending_approval") throw new Error("Count already reviewed");
  const transaction = await database.createTransaction({ ttl: 120 });
  try {
    const balance = await database.getDocument({ databaseId: id(), collectionId: "inventory_balances", documentId: String(count.balanceId), transactionId: transaction.$id });
    if (Number(balance.onHand) !== Number(count.expectedQuantity)) throw new Error("Stock changed after count; recount required");
    const now = new Date().toISOString();
    if (action === "approve") {
      const nextOnHand = Number(count.countedQuantity);
      if (nextOnHand < Number(balance.reserved) + Number(balance.damaged)) throw new Error("Count is below committed stock");
      await database.updateDocument({ databaseId: id(), collectionId: "inventory_balances", documentId: balance.$id, transactionId: transaction.$id, data: { onHand: nextOnHand, version: Number(balance.version) + 1 } });
      await database.createDocument({ databaseId: id(), collectionId: "inventory_movements", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { vendorId: count.vendorId, warehouseId: count.warehouseId, offerId: count.offerId, type: "stocktake_adjustment", quantity: Number(count.variance), referenceType: "inventory_count", referenceId: count.$id, actorUserId, occurredAt: now } });
    }
    await database.updateDocument({ databaseId: id(), collectionId: "inventory_counts", documentId: count.$id, transactionId: transaction.$id, data: { status: action === "approve" ? "approved" : "rejected", reviewedBy: actorUserId, reviewedAt: now, reviewNotes: notes.trim() } });
    await database.createDocument({ databaseId: id(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { actorUserId, action: `inventory_count.${action}`, entityType: "inventory_count", entityId: count.$id, metadata: JSON.stringify({ variance: count.variance, notes }), occurredAt: now } });
    await database.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) { await database.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
}
