import "server-only";
import { ID } from "node-appwrite";
import { createAppwriteAuthClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export async function createAssistedSeller(input: { actorUserId: string; email: string; temporaryPassword: string; fullName: string; phone: string; countryCode: string; legalName: string; tradingName: string; registrationNumber: string; businessType: string; address: string; storeName: string; storeSlug: string; currency: string }) {
  const email = input.email.trim().toLowerCase(), countryCode = input.countryCode.trim().toUpperCase(), currency = input.currency.trim().toUpperCase();
  if (input.temporaryPassword.length < 12 || countryCode.length !== 2 || currency.length !== 3) throw new Error("Invalid onboarding details");
  const userId = ID.unique(), businessId = ID.unique(), vendorId = ID.unique(), now = new Date().toISOString();
  const users = createAppwriteAuthClient().users;
  await users.create({ userId, email, password: input.temporaryPassword, name: input.fullName.trim() });
  const databases = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID, transaction = await databases.createTransaction({ ttl: 120 });
  try {
    await databases.createDocument({ databaseId, collectionId: "profiles", documentId: userId, permissions: [], transactionId: transaction.$id, data: { userId, email, fullName: input.fullName.trim(), phone: input.phone.trim(), countryCode } });
    await databases.createDocument({ databaseId, collectionId: "businesses", documentId: businessId, permissions: [], transactionId: transaction.$id, data: { ownerUserId: userId, legalName: input.legalName.trim(), ...(input.tradingName.trim() ? { tradingName: input.tradingName.trim() } : {}), registrationNumber: input.registrationNumber.trim(), countryCode, businessType: input.businessType, address: input.address.trim(), status: "active" } });
    await databases.createDocument({ databaseId, collectionId: "vendors", documentId: vendorId, permissions: [], transactionId: transaction.$id, data: { ownerUserId: userId, businessId, merchantId: `PAC-M-${vendorId.slice(-10).toUpperCase()}`, status: "active", submittedAt: now, reviewedAt: now, reviewedBy: input.actorUserId, reviewNotes: "Assisted onboarding by authorized administrator; compliance completion remains required." } });
    await databases.createDocument({ databaseId, collectionId: "stores", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { vendorId, ownerUserId: userId, name: input.storeName.trim(), slug: input.storeSlug.trim().toLowerCase(), countryCode, currency, status: "active" } });
    await databases.createDocument({ databaseId, collectionId: "vendor_review_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { vendorId, action: "assisted_onboarding", actorUserId: input.actorUserId, notes: "Seller login and active store created by an authorized onboarding administrator.", occurredAt: now } });
    await databases.createDocument({ databaseId, collectionId: "audit_logs", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { actorUserId: input.actorUserId, action: "seller.assisted_create", entityType: "vendor", entityId: vendorId, metadata: JSON.stringify({ userId, email, storeSlug: input.storeSlug.trim().toLowerCase() }), occurredAt: now } });
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
    return { userId, vendorId, email };
  } catch (error) { await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined); await users.delete({ userId }).catch(() => undefined); throw error; }
}
