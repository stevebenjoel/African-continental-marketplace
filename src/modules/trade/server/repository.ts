import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { calculateTradeReadiness, type TradePassportAction } from "@/src/modules/trade/domain/readiness";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;
const list = (value: string) => value.split(/[,\r\n]+/).map(item => item.trim()).filter(Boolean);

export async function getVendorTradeBundle(vendorId: string) {
  const database = db();
  const [passports, certifications, documents, shipments, events] = await Promise.all([
    database.listDocuments({ databaseId: databaseId(), collectionId: "trade_passports", queries: [Query.equal("vendorId", vendorId), Query.limit(1)] }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "trade_certifications", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("createdAt"), Query.limit(100)] }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "trade_documents", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("uploadedAt"), Query.limit(100)] }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "cross_border_shipments", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("createdAt"), Query.limit(100)] }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "trade_events", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("occurredAt"), Query.limit(100)] })
  ]);
  return { passport: passports.documents[0] ?? null, certifications: certifications.documents, documents: documents.documents, shipments: shipments.documents, events: events.documents };
}

export async function listTradePassports() {
  return db().listDocuments({ databaseId: databaseId(), collectionId: "trade_passports", queries: [Query.orderDesc("submittedAt"), Query.limit(200)] });
}

export async function submitTradePassport(input: { vendorId: string; ownerUserId: string; exporterNumber: string; targetCountries: string; productCategories: string; incoterms: string; transportModes: string }) {
  const database = db();
  const existing = await database.listDocuments({ databaseId: databaseId(), collectionId: "trade_passports", queries: [Query.equal("vendorId", input.vendorId), Query.limit(1)] });
  const bundle = await getVendorTradeBundle(input.vendorId);
  const targetCountries = list(input.targetCountries).map(code => code.toUpperCase()).filter(code => /^[A-Z]{2}$/.test(code)).slice(0, 30);
  const productCategories = list(input.productCategories).slice(0, 30);
  const incoterms = list(input.incoterms).map(value => value.toUpperCase()).slice(0, 12);
  const transportModes = list(input.transportModes).slice(0, 12);
  if (!targetCountries.length || !productCategories.length || !incoterms.length || !transportModes.length) throw new Error("Trade profile is incomplete");
  const data = { vendorId: input.vendorId, ownerUserId: input.ownerUserId, passportNumber: existing.documents[0]?.passportNumber ?? `PAC-TP-${new Date().getUTCFullYear()}-${input.vendorId.slice(-8).toUpperCase()}`, ...(input.exporterNumber ? { exporterNumber: input.exporterNumber } : {}), targetCountries, productCategories, incoterms: incoterms.join(", "), transportModes: transportModes.join(", "), readinessScore: calculateTradeReadiness({ exporterNumber: input.exporterNumber, targetCountries, productCategories, incoterms, transportModes, certificationCount: bundle.certifications.length, documentCount: bundle.documents.length }), status: "submitted", submittedAt: new Date().toISOString() };
  const passport = existing.documents[0] ? await database.updateDocument({ databaseId: databaseId(), collectionId: "trade_passports", documentId: existing.documents[0].$id, data }) : await database.createDocument({ databaseId: databaseId(), collectionId: "trade_passports", documentId: ID.unique(), permissions: [], data });
  await addTradeEvent(input.vendorId, "trade_passport", passport.$id, "submitted", input.ownerUserId);
  return passport;
}

export async function addTradeCertification(input: { vendorId: string; ownerUserId: string; certificationType: string; certificateNumber: string; issuingAuthority: string; countryCode: string; issuedAt: string; expiresAt?: string }) {
  const certification = await db().createDocument({ databaseId: databaseId(), collectionId: "trade_certifications", documentId: ID.unique(), permissions: [], data: { ...input, countryCode: input.countryCode.toUpperCase(), status: "submitted", createdAt: new Date().toISOString() } });
  await addTradeEvent(input.vendorId, "trade_certification", certification.$id, "submitted", input.ownerUserId);
  return certification;
}

export async function addTradeDocument(data: Record<string, unknown>) {
  const document = await db().createDocument({ databaseId: databaseId(), collectionId: "trade_documents", documentId: ID.unique(), permissions: [], data });
  await addTradeEvent(String(data.vendorId), "trade_document", document.$id, "uploaded", String(data.ownerUserId));
  return document;
}

export async function createCrossBorderShipment(input: { vendorId: string; actorUserId: string; orderId?: string; originCountryCode: string; destinationCountryCode: string; hsCodes: string; incoterm: string }) {
  if (input.originCountryCode.toUpperCase() === input.destinationCountryCode.toUpperCase()) throw new Error("Cross-border shipment requires different countries");
  const shipment = await db().createDocument({ databaseId: databaseId(), collectionId: "cross_border_shipments", documentId: ID.unique(), permissions: [], data: { shipmentNumber: `PAC-XB-${Date.now().toString(36).toUpperCase()}`, vendorId: input.vendorId, ...(input.orderId ? { orderId: input.orderId } : {}), originCountryCode: input.originCountryCode.toUpperCase(), destinationCountryCode: input.destinationCountryCode.toUpperCase(), hsCodes: input.hsCodes, incoterm: input.incoterm.toUpperCase(), customsStatus: "documentation_pending", status: "draft", createdAt: new Date().toISOString() } });
  await addTradeEvent(input.vendorId, "cross_border_shipment", shipment.$id, "created", input.actorUserId);
  return shipment;
}

export async function updateCustomsStatus(shipmentId: string, customsStatus: string, customsReference: string, actorUserId: string) {
  const allowed = ["documentation_pending", "submitted", "under_review", "cleared", "held", "rejected"];
  if (!allowed.includes(customsStatus)) throw new Error("Invalid customs status");
  const database = db(), shipment = await database.getDocument({ databaseId: databaseId(), collectionId: "cross_border_shipments", documentId: shipmentId });
  await database.updateDocument({ databaseId: databaseId(), collectionId: "cross_border_shipments", documentId: shipmentId, data: { customsStatus, ...(customsReference ? { customsReference } : {}), status: customsStatus === "cleared" ? "customs_cleared" : customsStatus === "rejected" ? "blocked" : "customs_processing", ...(customsStatus === "cleared" ? { clearedAt: new Date().toISOString() } : {}) } });
  await addTradeEvent(String(shipment.vendorId), "cross_border_shipment", shipmentId, `customs_${customsStatus}`, actorUserId, customsReference);
}

export async function reviewTradePassport(passportId: string, action: TradePassportAction, notes: string, actorUserId: string) {
  const database = db();
  const passport = await database.getDocument({ databaseId: databaseId(), collectionId: "trade_passports", documentId: passportId });
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "information_requested";
  await database.updateDocument({ databaseId: databaseId(), collectionId: "trade_passports", documentId: passportId, data: { status, reviewedAt: new Date().toISOString(), reviewedBy: actorUserId, ...(notes ? { reviewNotes: notes } : {}) } });
  await addTradeEvent(String(passport.vendorId), "trade_passport", passportId, action, actorUserId, notes);
  await database.createDocument({ databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId, action: `trade_passport.${action}`, entityType: "trade_passport", entityId: passportId, metadata: JSON.stringify({ vendorId: passport.vendorId, status }), occurredAt: new Date().toISOString() } });
}

async function addTradeEvent(vendorId: string, entityType: string, entityId: string, eventType: string, actorUserId: string, notes = "") {
  return db().createDocument({ databaseId: databaseId(), collectionId: "trade_events", documentId: ID.unique(), permissions: [], data: { vendorId, entityType, entityId, eventType, actorUserId, ...(notes ? { notes } : {}), occurredAt: new Date().toISOString() } });
}
