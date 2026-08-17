import "server-only";
import { ID, Query, type Databases } from "node-appwrite";

type Line = { accountCode: string; direction: "debit" | "credit"; amountMinor: number; vendorId?: string };

async function postJournal(databases: Databases, databaseId: string, transactionId: string, input: { referenceType: string; referenceId: string; description: string; currency: string; lines: Line[] }) {
  const debit = input.lines.filter(line => line.direction === "debit").reduce((sum, line) => sum + line.amountMinor, 0);
  const credit = input.lines.filter(line => line.direction === "credit").reduce((sum, line) => sum + line.amountMinor, 0);
  if (debit <= 0 || debit !== credit || input.lines.some(line => !Number.isSafeInteger(line.amountMinor) || line.amountMinor <= 0)) throw new Error("Unbalanced journal");
  const entryId = ID.unique();
  await databases.createDocument({ databaseId, collectionId: "journal_entries", documentId: entryId, permissions: [], transactionId, data: { referenceType: input.referenceType, referenceId: input.referenceId, description: input.description, currency: input.currency, status: "posted", postedAt: new Date().toISOString() } });
  for (const line of input.lines) await databases.createDocument({ databaseId, collectionId: "journal_lines", documentId: ID.unique(), permissions: [], transactionId, data: { journalEntryId: entryId, accountCode: line.accountCode, ...(line.vendorId ? { vendorId: line.vendorId } : {}), direction: line.direction, amountMinor: line.amountMinor, currency: input.currency } });
}

export function postPaymentJournal(databases: Databases, databaseId: string, transactionId: string, paymentId: string, totalMinor: number, subtotalMinor: number, currency: string) {
  const lines: Line[] = [{ accountCode: "marketplace_customer_funds", direction: "credit", amountMinor: subtotalMinor }];
  if (totalMinor > 0) lines.unshift({ accountCode: "cash_clearing", direction: "debit", amountMinor: totalMinor });
  if (subtotalMinor > totalMinor) lines.push({ accountCode: "promotion_expense", direction: "debit", amountMinor: subtotalMinor - totalMinor });
  return postJournal(databases, databaseId, transactionId, { referenceType: "payment", referenceId: paymentId, description: "Customer payment captured", currency, lines });
}

export async function postDeliveryJournal(databases: Databases, databaseId: string, transactionId: string, vendorOrder: Record<string, unknown> & { $id: string }) {
  const rules = await databases.listDocuments({ databaseId, collectionId: "commission_rules", queries: [Query.equal("status", "active"), Query.orderDesc("effectiveFrom"), Query.limit(1)], transactionId });
  const rate = Number(rules.documents[0]?.rateBasisPoints ?? 1000);
  const gross = Number(vendorOrder.subtotalMinor);
  const commission = Math.round(gross * rate / 10_000);
  const payable = gross - commission;
  const lines: Line[] = [{ accountCode: "marketplace_customer_funds", direction: "debit", amountMinor: gross }, { accountCode: "vendor_payable", direction: "credit", amountMinor: payable, vendorId: String(vendorOrder.vendorId) }];
  if (commission) lines.push({ accountCode: "commission_revenue", direction: "credit", amountMinor: commission });
  return postJournal(databases, databaseId, transactionId, { referenceType: "vendor_order_delivery", referenceId: vendorOrder.$id, description: "Recognise delivered sale and marketplace commission", currency: String(vendorOrder.currency), lines });
}

export function postRefundJournal(databases: Databases, databaseId: string, transactionId: string, input: { returnRequestId: string; vendorId: string; gross: number; commission: number; currency: string }) {
  const lines: Line[] = [{ accountCode: "vendor_payable", direction: "debit", amountMinor: input.gross - input.commission, vendorId: input.vendorId }, { accountCode: "customer_refunds_payable", direction: "credit", amountMinor: input.gross }];
  if (input.commission) lines.push({ accountCode: "commission_revenue", direction: "debit", amountMinor: input.commission });
  return postJournal(databases, databaseId, transactionId, { referenceType: "refund", referenceId: input.returnRequestId, description: "Reverse delivered sale for approved refund", currency: input.currency, lines });
}

export function postSettlementJournal(databases: Databases, databaseId: string, transactionId: string, input: { settlementId: string; vendorId: string; amountMinor: number; currency: string }) {
  return postJournal(databases, databaseId, transactionId, { referenceType: "settlement", referenceId: input.settlementId, description: "Vendor settlement processed", currency: input.currency, lines: [{ accountCode: "vendor_payable", direction: "debit", amountMinor: input.amountMinor, vendorId: input.vendorId }, { accountCode: "cash_clearing", direction: "credit", amountMinor: input.amountMinor }] });
}
