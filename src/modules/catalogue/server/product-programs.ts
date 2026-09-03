import "server-only";
import { ID, Models, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { validateProgramInput } from "@/src/modules/catalogue/domain/product-program";

const db = () => createAppwriteDatabaseClient().databases;
const databaseId = () => env().APPWRITE_DATABASE_ID;

export async function getProgramsForOffers(offerIds: string[]) {
  if (!offerIds.length) return new Map<string, Models.Document & Record<string, unknown>>();
  const rows = await db().listDocuments({ databaseId: databaseId(), collectionId: "product_programs", queries: [Query.equal("offerId", offerIds), Query.limit(5000)] });
  return new Map(rows.documents.map(row => [String(row.offerId), row as Models.Document & Record<string, unknown>]));
}

export async function getOfferProgram(offerId: string) {
  const rows = await db().listDocuments({ databaseId: databaseId(), collectionId: "product_programs", queries: [Query.equal("offerId", offerId), Query.limit(1)] });
  return rows.documents[0] ?? null;
}

export async function listVendorProgramOffers(vendorId: string) {
  const databases = db();
  const [offers, programs] = await Promise.all([
    databases.listDocuments({ databaseId: databaseId(), collectionId: "seller_offers", queries: [Query.equal("vendorId", vendorId), Query.equal("status", "approved"), Query.limit(5000)] }),
    databases.listDocuments({ databaseId: databaseId(), collectionId: "product_programs", queries: [Query.equal("vendorId", vendorId), Query.limit(5000)] })
  ]);
  const products = offers.documents.length ? await databases.listDocuments({ databaseId: databaseId(), collectionId: "products", queries: [Query.equal("$id", offers.documents.map(row => String(row.productId))), Query.limit(5000)] }) : { documents: [] };
  const productById = new Map(products.documents.map(row => [row.$id, row])), programByOffer = new Map(programs.documents.map(row => [String(row.offerId), row]));
  return offers.documents.map(offer => ({ offer, product: productById.get(String(offer.productId)), program: programByOffer.get(offer.$id) ?? null })).filter(row => row.product);
}

export async function saveProductProgram(input: { offerId: string; vendorId: string; actorUserId: string; preorderEnabled: boolean; preorderOpensAt?: string; preorderClosesAt?: string; estimatedDispatchAt?: string; preorderCapacity?: number; whiteLabelEnabled: boolean; whiteLabelMinimumQuantity?: number; whiteLabelLeadDays?: number; whiteLabelOptions?: string }) {
  validateProgramInput(input);
  const databases = db(), offer = await databases.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: input.offerId });
  if (String(offer.vendorId) !== input.vendorId) throw new Error("Offer ownership mismatch");
  const existing = await getOfferProgram(input.offerId), now = new Date().toISOString();
  const data = { offerId: input.offerId, vendorId: input.vendorId, productId: String(offer.productId), preorderEnabled: input.preorderEnabled, ...(input.preorderOpensAt ? { preorderOpensAt: input.preorderOpensAt } : {}), ...(input.preorderClosesAt ? { preorderClosesAt: input.preorderClosesAt } : {}), ...(input.estimatedDispatchAt ? { estimatedDispatchAt: input.estimatedDispatchAt } : {}), ...(input.preorderCapacity ? { preorderCapacity: input.preorderCapacity } : {}), preorderReserved: Number(existing?.preorderReserved ?? 0), whiteLabelEnabled: input.whiteLabelEnabled, ...(input.whiteLabelMinimumQuantity ? { whiteLabelMinimumQuantity: input.whiteLabelMinimumQuantity } : {}), ...(input.whiteLabelLeadDays ? { whiteLabelLeadDays: input.whiteLabelLeadDays } : {}), ...(input.whiteLabelOptions?.trim() ? { whiteLabelOptions: input.whiteLabelOptions.trim() } : {}), updatedAt: now, updatedBy: input.actorUserId };
  await databases.upsertDocument({ databaseId: databaseId(), collectionId: "product_programs", documentId: existing?.$id ?? input.offerId, permissions: [], data });
  await databases.createDocument({ databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId: input.actorUserId, action: "product.program_update", entityType: "offer", entityId: input.offerId, metadata: JSON.stringify({ preorderEnabled: input.preorderEnabled, whiteLabelEnabled: input.whiteLabelEnabled }), occurredAt: now } });
}

export async function listPublicProgramProducts(kind: "preorder" | "white_label") {
  const databases = db(), field = kind === "preorder" ? "preorderEnabled" : "whiteLabelEnabled";
  const programs = await databases.listDocuments({ databaseId: databaseId(), collectionId: "product_programs", queries: [Query.equal(field, true), Query.limit(5000)] });
  return Promise.all(programs.documents.map(async program => {
    const [offer, product] = await Promise.all([databases.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: String(program.offerId) }), databases.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(program.productId) })]);
    return offer.status === "approved" && product.status === "approved" ? { program, offer, product } : null;
  })).then(rows => rows.filter((row): row is NonNullable<typeof row> => Boolean(row)));
}
