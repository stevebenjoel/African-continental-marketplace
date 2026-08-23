import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { calculatePayable } from "@/src/modules/finance/domain/payable";
import { postSettlementJournal } from "@/src/modules/finance/server/journals";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;
const reservingStatuses = ["requested", "approved"];

export async function getSellerWallet(vendorId: string) {
  const [lines, requests] = await Promise.all([
    db().listDocuments({ databaseId: databaseId(), collectionId: "journal_lines", queries: [Query.equal("vendorId", vendorId), Query.equal("accountCode", "vendor_payable"), Query.limit(5000)] }),
    db().listDocuments({ databaseId: databaseId(), collectionId: "withdrawal_requests", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("requestedAt"), Query.limit(200)] })
  ]);
  const currencies = new Set([...lines.documents.map(line => String(line.currency)), ...requests.documents.map(item => String(item.currency))]);
  const balances = [...currencies].map(currency => {
    const earned = calculatePayable(lines.documents.filter(line => line.currency === currency).map(line => ({ direction: String(line.direction) as "debit" | "credit", amountMinor: Number(line.amountMinor) })));
    const pending = requests.documents.filter(item => item.currency === currency && reservingStatuses.includes(String(item.status))).reduce((sum, item) => sum + Number(item.amountMinor), 0);
    return { currency, ledgerBalanceMinor: earned, pendingMinor: pending, availableMinor: Math.max(0, earned - pending) };
  });
  return { balances, requests: requests.documents };
}

export async function requestWithdrawal(input: { vendorId: string; sellerUserId: string; currency: string; amountMinor: number; payoutAccount: string; sellerNote: string }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || !/^[A-Z]{3}$/.test(input.currency) || input.payoutAccount.trim().length < 5) throw new Error("Invalid withdrawal request");
  const wallet = await getSellerWallet(input.vendorId), balance = wallet.balances.find(item => item.currency === input.currency);
  if (!balance || input.amountMinor > balance.availableMinor) throw new Error("Amount exceeds available balance");
  const id = ID.unique(), now = new Date().toISOString();
  return db().createDocument({ databaseId: databaseId(), collectionId: "withdrawal_requests", documentId: id, permissions: [], data: { requestNumber: `PAC-WDR-${new Date().getUTCFullYear()}-${id.slice(-10).toUpperCase()}`, vendorId: input.vendorId, sellerUserId: input.sellerUserId, amountMinor: input.amountMinor, currency: input.currency, status: "requested", payoutAccount: input.payoutAccount.trim(), ...(input.sellerNote.trim() ? { sellerNote: input.sellerNote.trim() } : {}), requestedAt: now } });
}

export const listWithdrawalRequests = () => db().listDocuments({ databaseId: databaseId(), collectionId: "withdrawal_requests", queries: [Query.orderDesc("requestedAt"), Query.limit(300)] });

export async function reviewWithdrawal(input: { requestId: string; action: "pay" | "reject"; actorUserId: string; note: string }) {
  const databases = db(), id = databaseId(), transaction = await databases.createTransaction({ ttl: 120 });
  try {
    const request = await databases.getDocument({ databaseId: id, collectionId: "withdrawal_requests", documentId: input.requestId, transactionId: transaction.$id });
    if (request.status !== "requested") throw new Error("Request already reviewed");
    const now = new Date().toISOString();
    if (input.action === "reject") {
      await databases.updateDocument({ databaseId: id, collectionId: "withdrawal_requests", documentId: request.$id, transactionId: transaction.$id, data: { status: "rejected", reviewedBy: input.actorUserId, reviewedAt: now, ...(input.note.trim() ? { reviewNote: input.note.trim() } : {}) } });
    } else {
      const lines = await databases.listDocuments({ databaseId: id, collectionId: "journal_lines", queries: [Query.equal("vendorId", request.vendorId), Query.equal("accountCode", "vendor_payable"), Query.equal("currency", request.currency), Query.limit(5000)], transactionId: transaction.$id });
      const payable = calculatePayable(lines.documents.map(line => ({ direction: String(line.direction) as "debit" | "credit", amountMinor: Number(line.amountMinor) })));
      if (Number(request.amountMinor) > payable) throw new Error("Insufficient payable balance");
      const settlementId = ID.unique(), settlementNumber = `PAC-SET-${new Date().getUTCFullYear()}-${settlementId.slice(-10).toUpperCase()}`;
      await databases.createDocument({ databaseId: id, collectionId: "settlements", documentId: settlementId, permissions: [], transactionId: transaction.$id, data: { settlementNumber, vendorId: request.vendorId, amountMinor: request.amountMinor, currency: request.currency, status: "paid", provider: "central_account", providerReference: request.requestNumber, createdBy: input.actorUserId, createdAt: now, processedAt: now } });
      await postSettlementJournal(databases, id, transaction.$id, { settlementId, vendorId: String(request.vendorId), amountMinor: Number(request.amountMinor), currency: String(request.currency) });
      await databases.updateDocument({ databaseId: id, collectionId: "withdrawal_requests", documentId: request.$id, transactionId: transaction.$id, data: { status: "paid", reviewedBy: input.actorUserId, reviewedAt: now, paidAt: now, settlementId, ...(input.note.trim() ? { reviewNote: input.note.trim() } : {}) } });
    }
    await databases.createDocument({ databaseId: id, collectionId: "audit_logs", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { actorUserId: input.actorUserId, action: `withdrawal.${input.action}`, entityType: "withdrawal_request", entityId: request.$id, metadata: JSON.stringify({ vendorId: request.vendorId, amountMinor: request.amountMinor, currency: request.currency }), occurredAt: now } });
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) { await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); throw error; }
}
