import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { findBusinessBuyer } from "@/src/modules/wholesale/server/repository";
import { assertNegotiationAction, isAcceptedNegotiationUsable, validateNegotiatedPrice, type NegotiationActor, type NegotiationStatus } from "@/src/modules/wholesale/domain/negotiation";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;
const now = () => new Date().toISOString();

async function notify(userId: string, title: string, body: string, href: string, transactionId?: string) {
  await db().createDocument({ databaseId: databaseId(), collectionId: "notifications", documentId: ID.unique(), permissions: [], transactionId, data: { userId, type: "wholesale_negotiation", title, body, href, createdAt: now() } });
}

export const listBuyerNegotiations = (buyerUserId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "price_negotiations", queries: [Query.equal("buyerUserId", buyerUserId), Query.orderDesc("updatedAt"), Query.limit(100)] });
export const listVendorNegotiations = (vendorId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "price_negotiations", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("updatedAt"), Query.limit(100)] });
export const listAllNegotiations = () => db().listDocuments({ databaseId: databaseId(), collectionId: "price_negotiations", queries: [Query.orderDesc("updatedAt"), Query.limit(200)] });
export const listNegotiationOffers = (negotiationId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "negotiation_offers", queries: [Query.equal("negotiationId", negotiationId), Query.orderAsc("sequence"), Query.limit(100)] });
export async function getNegotiationForAdmin(negotiationId: string) { return { negotiation: await db().getDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: negotiationId }), offers: (await listNegotiationOffers(negotiationId)).documents }; }
export async function getNegotiationSettings(offerId: string) {
  const database = db(), [result, offer] = await Promise.all([
    database.listDocuments({ databaseId: databaseId(), collectionId: "negotiation_settings", queries: [Query.equal("offerId", offerId), Query.limit(1)] }),
    database.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: offerId })
  ]);
  return result.documents[0] ?? { offerId, vendorId: offer.vendorId, enabled: "true", minimumQuantity: offer.minimumOrderQuantity, expiryHours: 48, allowCounteroffers: "true" };
}

export async function getNegotiationForParticipant(negotiationId: string, userId: string, vendorId?: string) {
  const negotiation = await db().getDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: negotiationId });
  if (negotiation.buyerUserId !== userId && negotiation.vendorId !== vendorId) throw new Error("Negotiation not found");
  return { negotiation, offers: (await listNegotiationOffers(negotiationId)).documents };
}

export async function saveNegotiationSettings(input: { actorUserId: string; vendorId: string; offerId: string; enabled: boolean; minimumQuantity: number; floorUnitPriceMinor?: number; maximumDiscountBasisPoints?: number; expiryHours: number; allowCounteroffers: boolean }) {
  const database = db(), offer = await database.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: input.offerId });
  if (offer.vendorId !== input.vendorId || input.minimumQuantity < Number(offer.minimumOrderQuantity) || input.expiryHours < 1 || input.expiryHours > 168) throw new Error("Invalid negotiation settings");
  const existing = await database.listDocuments({ databaseId: databaseId(), collectionId: "negotiation_settings", queries: [Query.equal("offerId", input.offerId), Query.limit(1)] });
  const data = { offerId: input.offerId, vendorId: input.vendorId, enabled: String(input.enabled), minimumQuantity: input.minimumQuantity, ...(input.floorUnitPriceMinor ? { floorUnitPriceMinor: input.floorUnitPriceMinor } : {}), ...(input.maximumDiscountBasisPoints ? { maximumDiscountBasisPoints: input.maximumDiscountBasisPoints } : {}), expiryHours: input.expiryHours, allowCounteroffers: String(input.allowCounteroffers), updatedAt: now() };
  if (existing.documents[0]) await database.updateDocument({ databaseId: databaseId(), collectionId: "negotiation_settings", documentId: existing.documents[0].$id, data });
  else await database.createDocument({ databaseId: databaseId(), collectionId: "negotiation_settings", documentId: ID.unique(), permissions: [], data });
}

export async function createNegotiation(input: { buyerUserId: string; offerId: string; quantity: number; unitPriceMinor: number; deliveryCountryCode: string; requestedDeliveryAt?: string; message: string }) {
  const database = db(), buyer = await findBusinessBuyer(input.buyerUserId);
  if (!buyer || buyer.status !== "approved") throw new Error("Approved business buyer required");
  const [offer, settingsResult] = await Promise.all([
    database.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: input.offerId }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "negotiation_settings", queries: [Query.equal("offerId", input.offerId), Query.limit(1)] })
  ]);
  const settings = settingsResult.documents[0] ?? { enabled: "true", minimumQuantity: offer.minimumOrderQuantity, expiryHours: 48, allowCounteroffers: "true" };
  if (offer.status !== "approved" || settings.enabled !== "true") throw new Error("Negotiation is unavailable");
  const [product, vendor] = await Promise.all([
    database.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(offer.productId) }),
    database.getDocument({ databaseId: databaseId(), collectionId: "vendors", documentId: String(offer.vendorId) })
  ]);
  const regularUnitPriceMinor = Number(offer.wholesalePriceMinor ?? offer.retailPriceMinor);
  validateNegotiatedPrice({ unitPriceMinor: input.unitPriceMinor, quantity: input.quantity, regularUnitPriceMinor, minimumQuantity: Number(settings.minimumQuantity) });
  const negotiationId = ID.unique(), createdAt = now(), expiresAt = new Date(Date.now() + Number(settings.expiryHours) * 3_600_000).toISOString();
  await database.createDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: negotiationId, permissions: [], data: { negotiationNumber: `PAC-NEG-${new Date().getUTCFullYear()}-${negotiationId.slice(-10).toUpperCase()}`, buyerUserId: input.buyerUserId, businessBuyerId: buyer.$id, vendorId: offer.vendorId, sellerUserId: vendor.ownerUserId, offerId: offer.$id, productId: product.$id, productName: product.name, regularUnitPriceMinor, currentUnitPriceMinor: input.unitPriceMinor, quantity: input.quantity, currency: offer.currency, deliveryCountryCode: input.deliveryCountryCode.toUpperCase(), ...(input.requestedDeliveryAt ? { requestedDeliveryAt: input.requestedDeliveryAt } : {}), status: "submitted", actionRequiredBy: "seller", expiresAt, createdAt, updatedAt: createdAt } });
  await database.createDocument({ databaseId: databaseId(), collectionId: "negotiation_offers", documentId: ID.unique(), permissions: [], data: { negotiationId, sequence: 1, proposedBy: "buyer", actorUserId: input.buyerUserId, unitPriceMinor: input.unitPriceMinor, quantity: input.quantity, currency: offer.currency, message: input.message.trim(), validUntil: expiresAt, createdAt } });
  await database.createDocument({ databaseId: databaseId(), collectionId: "negotiation_events", documentId: ID.unique(), permissions: [], data: { negotiationId, actorUserId: input.buyerUserId, actorRole: "buyer", eventType: "submitted", message: input.message.trim(), occurredAt: createdAt } });
  await notify(String(vendor.ownerUserId), "New wholesale price request", `${buyer.organizationName} requested a price for ${product.name}.`, `/seller/wholesale/negotiations/${negotiationId}`);
  return negotiationId;
}

export async function respondToNegotiation(input: { negotiationId: string; actorUserId: string; actor: NegotiationActor; eventActorRole?: "buyer" | "seller" | "admin_proxy"; vendorId?: string; action: "accept" | "reject" | "counter" | "withdraw"; unitPriceMinor?: number; quantity?: number; message: string }) {
  const database = db(), negotiation = await database.getDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: input.negotiationId });
  if (input.actor === "buyer" ? negotiation.buyerUserId !== input.actorUserId : negotiation.vendorId !== input.vendorId) throw new Error("Negotiation not found");
  if (new Date(String(negotiation.expiresAt)) <= new Date()) { await database.updateDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: input.negotiationId, data: { status: "expired", updatedAt: now() } }); throw new Error("Negotiation expired"); }
  assertNegotiationAction(String(negotiation.status) as NegotiationStatus, input.actor, input.action);
  const occurredAt = now(), recipient = input.actor === "buyer" ? String(negotiation.sellerUserId) : String(negotiation.buyerUserId), recipientHref = input.actor === "buyer" ? `/seller/wholesale/negotiations/${input.negotiationId}` : `/wholesale/negotiations/${input.negotiationId}`;
  if (input.action === "counter") {
    const settingsResult = await database.listDocuments({ databaseId: databaseId(), collectionId: "negotiation_settings", queries: [Query.equal("offerId", String(negotiation.offerId)), Query.limit(1)] }), settings = settingsResult.documents[0];
    if (!settings || settings.allowCounteroffers !== "true") throw new Error("Counteroffers are disabled");
    const unitPriceMinor = Number(input.unitPriceMinor), quantity = Number(input.quantity);
    validateNegotiatedPrice({ unitPriceMinor, quantity, regularUnitPriceMinor: Number(negotiation.regularUnitPriceMinor), minimumQuantity: Number(settings.minimumQuantity), ...(input.actor === "seller" && settings.floorUnitPriceMinor ? { floorUnitPriceMinor: Number(settings.floorUnitPriceMinor) } : {}), ...(input.actor === "seller" && settings.maximumDiscountBasisPoints ? { maximumDiscountBasisPoints: Number(settings.maximumDiscountBasisPoints) } : {}) });
    const offers = await listNegotiationOffers(input.negotiationId), sequence = offers.total + 1, status = input.actor === "seller" ? "seller_countered" : "buyer_countered", actionRequiredBy = input.actor === "seller" ? "buyer" : "seller";
    await database.createDocument({ databaseId: databaseId(), collectionId: "negotiation_offers", documentId: ID.unique(), permissions: [], data: { negotiationId: input.negotiationId, sequence, proposedBy: input.actor, actorUserId: input.actorUserId, unitPriceMinor, quantity, currency: negotiation.currency, message: input.message.trim(), validUntil: negotiation.expiresAt, createdAt: occurredAt } });
    await database.updateDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: input.negotiationId, data: { currentUnitPriceMinor: unitPriceMinor, quantity, status, actionRequiredBy, updatedAt: occurredAt } });
    await notify(recipient, "Wholesale counteroffer received", `${negotiation.productName}: a new counteroffer requires your response.`, recipientHref);
  } else {
    const status = input.action === "accept" ? "accepted" : input.action === "reject" ? "rejected" : "withdrawn";
    await database.updateDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: input.negotiationId, data: { status, actionRequiredBy: "", ...(status === "accepted" ? { acceptedAt: occurredAt } : {}), updatedAt: occurredAt } });
    await notify(recipient, `Wholesale negotiation ${status}`, `${negotiation.productName}: ${input.message.trim() || status}.`, recipientHref);
  }
  await database.createDocument({ databaseId: databaseId(), collectionId: "negotiation_events", documentId: ID.unique(), permissions: [], data: { negotiationId: input.negotiationId, actorUserId: input.actorUserId, actorRole: input.eventActorRole ?? input.actor, eventType: input.action, message: input.message.trim(), occurredAt } });
}

export async function addAcceptedNegotiationToCart(userId: string, negotiationId: string) {
  const database = db(), negotiation = await database.getDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: negotiationId });
  if (negotiation.buyerUserId !== userId || !isAcceptedNegotiationUsable(String(negotiation.status), String(negotiation.expiresAt), negotiation.usedAt)) throw new Error("Accepted price is unavailable");
  const [offer, product, balances, existingCart] = await Promise.all([
    database.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: String(negotiation.offerId) }),
    database.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(negotiation.productId) }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "inventory_balances", queries: [Query.equal("offerId", String(negotiation.offerId)), Query.limit(100)] }),
    database.listDocuments({ databaseId: databaseId(), collectionId: "carts", queries: [Query.equal("userId", userId), Query.limit(1)] })
  ]);
  const available = balances.documents.reduce((sum, item) => sum + Number(item.onHand) - Number(item.reserved) - Number(item.damaged), 0), quantity = Number(negotiation.quantity);
  if (offer.status !== "approved" || product.status !== "approved" || available < quantity) throw new Error("Stock unavailable");
  if (!existingCart.documents[0]) await database.createDocument({ databaseId: databaseId(), collectionId: "carts", documentId: userId, permissions: [], data: { userId, status: "active", updatedAt: now() } });
  const cartItem = await database.listDocuments({ databaseId: databaseId(), collectionId: "cart_items", queries: [Query.equal("cartId", userId), Query.equal("offerId", String(negotiation.offerId)), Query.limit(1)] });
  const data = { cartId: userId, userId, vendorId: negotiation.vendorId, productId: negotiation.productId, ...(offer.variantId ? { variantId: offer.variantId } : {}), offerId: negotiation.offerId, negotiationId, quantity, unitPriceMinor: negotiation.currentUnitPriceMinor, currency: negotiation.currency, productName: product.name, sellerSku: offer.sellerSku, fulfilmentMethod: offer.fulfilmentMethod, updatedAt: now() };
  if (cartItem.documents[0]) await database.updateDocument({ databaseId: databaseId(), collectionId: "cart_items", documentId: cartItem.documents[0].$id, data });
  else await database.createDocument({ databaseId: databaseId(), collectionId: "cart_items", documentId: ID.unique(), permissions: [], data });
}
