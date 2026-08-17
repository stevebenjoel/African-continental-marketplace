import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { calculatePayable } from "@/src/modules/finance/domain/payable";
import { postSettlementJournal } from "@/src/modules/finance/server/journals";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const databases = () => createAppwriteDatabaseClient().databases;
export const listSettlements = (vendorId?: string) => databases().listDocuments({ databaseId: databaseId(), collectionId: "settlements", queries: [...(vendorId ? [Query.equal("vendorId", vendorId)] : []), Query.orderDesc("createdAt"), Query.limit(200)] });

export async function listVendorPayables() {
  const lines = await databases().listDocuments({ databaseId: databaseId(), collectionId: "journal_lines", queries: [Query.equal("accountCode", "vendor_payable"), Query.limit(5000)] });
  const grouped = new Map<string, { vendorId: string; currency: string; amountMinor: number }>();
  for (const line of lines.documents) { const key = `${line.vendorId}:${line.currency}`, current = grouped.get(key) ?? { vendorId: String(line.vendorId), currency: String(line.currency), amountMinor: 0 }; current.amountMinor += line.direction === "credit" ? Number(line.amountMinor) : -Number(line.amountMinor); grouped.set(key, current); }
  return Array.from(grouped.values()).filter(row => row.amountMinor > 0);
}

export async function processSettlement(input: { vendorId: string; currency: string; actorUserId: string }) {
  const db = databases(), id = databaseId(), transaction = await db.createTransaction({ ttl: 120 });
  try {
    const lines = await db.listDocuments({ databaseId: id, collectionId: "journal_lines", queries: [Query.equal("vendorId", input.vendorId), Query.equal("accountCode", "vendor_payable"), Query.equal("currency", input.currency), Query.limit(5000)], transactionId: transaction.$id });
    const amountMinor = calculatePayable(lines.documents.map(line => ({ direction: String(line.direction) as "debit" | "credit", amountMinor: Number(line.amountMinor) })));
    if (amountMinor <= 0) throw new Error("Vendor has no payable balance");
    const settlementId = ID.unique(), now = new Date().toISOString(), settlementNumber = `PAC-SET-${new Date().getUTCFullYear()}-${settlementId.slice(-10).toUpperCase()}`;
    await db.createDocument({ databaseId: id, collectionId: "settlements", documentId: settlementId, permissions: [], transactionId: transaction.$id, data: { settlementNumber, vendorId: input.vendorId, amountMinor, currency: input.currency, status: "paid", provider: "simulated", providerReference: `SIM-${settlementId}`, createdBy: input.actorUserId, createdAt: now, processedAt: now } });
    await postSettlementJournal(db, id, transaction.$id, { settlementId, vendorId: input.vendorId, amountMinor, currency: input.currency });
    await db.createDocument({ databaseId: id, collectionId: "audit_logs", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { actorUserId: input.actorUserId, action: "settlement.process", entityType: "settlement", entityId: settlementId, metadata: JSON.stringify({ vendorId: input.vendorId, amountMinor, currency: input.currency }), occurredAt: now } });
    await db.updateTransaction({ transactionId: transaction.$id, commit: true });
    return settlementId;
  } catch (error) { await db.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
}
