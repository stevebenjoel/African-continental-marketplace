import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;

export type VendorDocument = Record<string, unknown> & { $id: string };

export async function findVendorByOwner(ownerUserId: string) {
  const result = await db().listDocuments({ databaseId: databaseId(), collectionId: "vendors", queries: [Query.equal("ownerUserId", ownerUserId), Query.limit(1)] });
  return (result.documents[0] as VendorDocument | undefined) ?? null;
}

export async function createVendorApplication(input: { userId: string; email: string; fullName: string; phone: string; countryCode: string; legalName: string; tradingName: string; registrationNumber: string; taxId: string; businessType: string; vendorType: string; address: string; operationalAddress: string; directors: string[]; beneficialOwners: string[]; bankName: string; bankAccountName: string; bankAccountNumber: string; bankCountryCode: string; swiftCode: string; exporterNumber: string; storeName: string; storeSlug: string; currency: string }) {
  const databases = db();
  const businessId = ID.unique();
  const vendorId = ID.unique();
  await databases.upsertDocument({ databaseId: databaseId(), collectionId: "profiles", documentId: input.userId, permissions: [], data: { userId: input.userId, email: input.email, fullName: input.fullName, phone: input.phone, countryCode: input.countryCode } });
  await databases.createDocument({ databaseId: databaseId(), collectionId: "businesses", documentId: businessId, permissions: [], data: { ownerUserId: input.userId, legalName: input.legalName, ...(input.tradingName ? { tradingName: input.tradingName } : {}), registrationNumber: input.registrationNumber, ...(input.taxId ? { taxId: input.taxId } : {}), countryCode: input.countryCode, businessType: input.businessType, address: input.address, status: "pending_review" } });
  await databases.createDocument({ databaseId: databaseId(), collectionId: "vendors", documentId: vendorId, permissions: [], data: { ownerUserId: input.userId, businessId, status: "pending_review", submittedAt: new Date().toISOString() } });
  await databases.createDocument({ databaseId: databaseId(), collectionId: "vendor_compliance", documentId: ID.unique(), permissions: [], data: { vendorId, ownerUserId: input.userId, vendorType: input.vendorType, operationalAddress: input.operationalAddress, directors: input.directors, beneficialOwners: input.beneficialOwners, bankName: input.bankName, bankAccountName: input.bankAccountName, bankAccountNumber: input.bankAccountNumber, bankCountryCode: input.bankCountryCode, ...(input.swiftCode ? { swiftCode: input.swiftCode } : {}), ...(input.exporterNumber ? { exporterNumber: input.exporterNumber } : {}), complianceStatus: "submitted" } });
  await databases.createDocument({ databaseId: databaseId(), collectionId: "stores", documentId: ID.unique(), permissions: [], data: { vendorId, ownerUserId: input.userId, name: input.storeName, slug: input.storeSlug, countryCode: input.countryCode, currency: input.currency, status: "draft" } });
  return { vendorId };
}

export async function addVendorDocument(data: Record<string, unknown>) {
  return db().createDocument({ databaseId: databaseId(), collectionId: "vendor_documents", documentId: ID.unique(), permissions: [], data });
}

export async function listVendors() {
  return db().listDocuments({ databaseId: databaseId(), collectionId: "vendors", queries: [Query.orderDesc("submittedAt"), Query.limit(100)] });
}

export async function getVendorBundle(vendorId: string) {
  const databases = db();
  const vendor = await databases.getDocument({ databaseId: databaseId(), collectionId: "vendors", documentId: vendorId });
  const [business, compliance, store, documents, events] = await Promise.all([
    databases.getDocument({ databaseId: databaseId(), collectionId: "businesses", documentId: String(vendor.businessId) }),
    databases.listDocuments({ databaseId: databaseId(), collectionId: "vendor_compliance", queries: [Query.equal("vendorId", vendorId), Query.limit(1)] }),
    databases.listDocuments({ databaseId: databaseId(), collectionId: "stores", queries: [Query.equal("vendorId", vendorId), Query.limit(1)] }),
    databases.listDocuments({ databaseId: databaseId(), collectionId: "vendor_documents", queries: [Query.equal("vendorId", vendorId)] }),
    databases.listDocuments({ databaseId: databaseId(), collectionId: "vendor_review_events", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("occurredAt")] })
  ]);
  return { vendor, business, compliance: compliance.documents[0], store: store.documents[0], documents: documents.documents, events: events.documents };
}

export async function reviewVendor(vendorId: string, action: "approve" | "reject" | "request_information", notes: string, actorUserId: string) {
  const databases = db();
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "information_requested";
  const data: Record<string, unknown> = { status, reviewedAt: new Date().toISOString(), reviewedBy: actorUserId, ...(notes ? { reviewNotes: notes } : {}) };
  if (action === "approve") data.merchantId = `PAC-${new Date().getUTCFullYear()}-${vendorId.slice(-8).toUpperCase()}`;
  const vendor = await databases.updateDocument({ databaseId: databaseId(), collectionId: "vendors", documentId: vendorId, data });
  await Promise.all([
    databases.updateDocument({ databaseId: databaseId(), collectionId: "businesses", documentId: String(vendor.businessId), data: { status } }),
    ...(action === "approve" ? [(async () => { const stores = await databases.listDocuments({ databaseId: databaseId(), collectionId: "stores", queries: [Query.equal("vendorId", vendorId), Query.limit(1)] }); if (stores.documents[0]) await databases.updateDocument({ databaseId: databaseId(), collectionId: "stores", documentId: stores.documents[0].$id, data: { status: "active" } }); })()] : []),
    databases.createDocument({ databaseId: databaseId(), collectionId: "vendor_review_events", documentId: ID.unique(), permissions: [], data: { vendorId, action, actorUserId, ...(notes ? { notes } : {}), occurredAt: new Date().toISOString() } }),
    databases.createDocument({ databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId, action: `vendor.${action}`, entityType: "vendor", entityId: vendorId, metadata: JSON.stringify({ status }), occurredAt: new Date().toISOString() } })
  ]);
}
