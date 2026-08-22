import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { resolveWholesalePrice } from "@/src/modules/wholesale/domain/pricing";
import { isAcceptedNegotiationUsable } from "@/src/modules/wholesale/domain/negotiation";
import { findBusinessBuyer, listPriceTiers } from "@/src/modules/wholesale/server/repository";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const now = () => new Date().toISOString();

type WholesaleCartInput = {
  userId: string; businessBuyerId: string; vendorId: string; productId: string; productName: string;
  offerId: string; variantId?: string; sellerSku: string; fulfilmentMethod: string; quantity: number;
  unitPriceMinor: number; currency: string; sourceType: "listed_offer" | "negotiation"; sourceId: string; negotiationId?: string;
};

async function createPurchaseOrderAndCart(input: WholesaleCartInput) {
  const database = createAppwriteDatabaseClient().databases, transaction = await database.createTransaction({ ttl: 120 });
  const createdAt = now(), purchaseOrderId = ID.unique(), totalMinor = input.unitPriceMinor * input.quantity;
  try {
    await database.createDocument({ databaseId: databaseId(), collectionId: "purchase_orders", documentId: purchaseOrderId, permissions: [], transactionId: transaction.$id, data: { purchaseOrderNumber: `PAC-PO-${new Date().getUTCFullYear()}-${purchaseOrderId.slice(-10).toUpperCase()}`, buyerUserId: input.userId, businessBuyerId: input.businessBuyerId, vendorId: input.vendorId, sourceType: input.sourceType, sourceId: input.sourceId, status: "submitted", currency: input.currency, totalMinor, createdAt, submittedAt: createdAt } });
    await database.createDocument({ databaseId: databaseId(), collectionId: "purchase_order_items", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { purchaseOrderId, productId: input.productId, offerId: input.offerId, productName: input.productName, quantity: input.quantity, unitPriceMinor: input.unitPriceMinor, lineTotalMinor: totalMinor, currency: input.currency } });
    const carts = await database.listDocuments({ databaseId: databaseId(), collectionId: "carts", queries: [Query.equal("userId", input.userId), Query.limit(1)], transactionId: transaction.$id });
    if (carts.documents[0]) await database.updateDocument({ databaseId: databaseId(), collectionId: "carts", documentId: carts.documents[0].$id, transactionId: transaction.$id, data: { status: "active", updatedAt: createdAt } });
    else await database.createDocument({ databaseId: databaseId(), collectionId: "carts", documentId: input.userId, permissions: [], transactionId: transaction.$id, data: { userId: input.userId, status: "active", updatedAt: createdAt } });
    const existingItems = await database.listDocuments({ databaseId: databaseId(), collectionId: "cart_items", queries: [Query.equal("cartId", input.userId), Query.equal("offerId", input.offerId), Query.limit(1)], transactionId: transaction.$id });
    const cartData = { cartId: input.userId, userId: input.userId, vendorId: input.vendorId, productId: input.productId, ...(input.variantId ? { variantId: input.variantId } : {}), offerId: input.offerId, negotiationId: input.negotiationId ?? null, purchaseOrderId, quantity: input.quantity, unitPriceMinor: input.unitPriceMinor, currency: input.currency, productName: input.productName, sellerSku: input.sellerSku, fulfilmentMethod: input.fulfilmentMethod, updatedAt: createdAt };
    if (existingItems.documents[0]) await database.updateDocument({ databaseId: databaseId(), collectionId: "cart_items", documentId: existingItems.documents[0].$id, transactionId: transaction.$id, data: cartData });
    else await database.createDocument({ databaseId: databaseId(), collectionId: "cart_items", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: cartData });
    await database.updateTransaction({ transactionId: transaction.$id, commit: true });
    return purchaseOrderId;
  } catch (error) {
    await database.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw error;
  }
}

export async function createListedWholesaleCheckout(userId: string, offerId: string, quantity: number) {
  const database = createAppwriteDatabaseClient().databases;
  const [buyer, offer] = await Promise.all([findBusinessBuyer(userId), database.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: offerId })]);
  if (!buyer || buyer.status !== "approved" || offer.status !== "approved" || !Number.isSafeInteger(quantity) || quantity < Number(offer.minimumOrderQuantity) || (offer.maximumOrderQuantity && quantity > Number(offer.maximumOrderQuantity))) throw new Error("Wholesale checkout is unavailable");
  const [product, tiers, balances] = await Promise.all([database.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(offer.productId) }), listPriceTiers(offerId), database.listDocuments({ databaseId: databaseId(), collectionId: "inventory_balances", queries: [Query.equal("offerId", offerId), Query.limit(100)] })]);
  const available = balances.documents.reduce((sum, balance) => sum + Number(balance.onHand) - Number(balance.reserved) - Number(balance.damaged), 0);
  if (product.status !== "approved" || available < quantity) throw new Error("Wholesale stock is unavailable");
  const unitPriceMinor = resolveWholesalePrice(quantity, Number(offer.wholesalePriceMinor ?? offer.retailPriceMinor), tiers.documents.map(tier => ({ minimumQuantity: Number(tier.minimumQuantity), ...(tier.maximumQuantity ? { maximumQuantity: Number(tier.maximumQuantity) } : {}), unitPriceMinor: Number(tier.unitPriceMinor) })));
  return createPurchaseOrderAndCart({ userId, businessBuyerId: buyer.$id, vendorId: String(offer.vendorId), productId: String(product.$id), productName: String(product.name), offerId, ...(offer.variantId ? { variantId: String(offer.variantId) } : {}), sellerSku: String(offer.sellerSku), fulfilmentMethod: String(offer.fulfilmentMethod), quantity, unitPriceMinor, currency: String(offer.currency), sourceType: "listed_offer", sourceId: offerId });
}

export async function createNegotiatedWholesaleCheckout(userId: string, negotiationId: string) {
  const database = createAppwriteDatabaseClient().databases;
  const negotiation = await database.getDocument({ databaseId: databaseId(), collectionId: "price_negotiations", documentId: negotiationId });
  if (negotiation.buyerUserId !== userId || !isAcceptedNegotiationUsable(String(negotiation.status), String(negotiation.expiresAt), negotiation.usedAt)) throw new Error("Accepted price is unavailable");
  const [offer, product, balances] = await Promise.all([database.getDocument({ databaseId: databaseId(), collectionId: "seller_offers", documentId: String(negotiation.offerId) }), database.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(negotiation.productId) }), database.listDocuments({ databaseId: databaseId(), collectionId: "inventory_balances", queries: [Query.equal("offerId", String(negotiation.offerId)), Query.limit(100)] })]);
  const quantity = Number(negotiation.quantity), available = balances.documents.reduce((sum, balance) => sum + Number(balance.onHand) - Number(balance.reserved) - Number(balance.damaged), 0);
  if (offer.status !== "approved" || product.status !== "approved" || available < quantity) throw new Error("Wholesale stock is unavailable");
  return createPurchaseOrderAndCart({ userId, businessBuyerId: String(negotiation.businessBuyerId), vendorId: String(negotiation.vendorId), productId: String(negotiation.productId), productName: String(product.name), offerId: String(negotiation.offerId), ...(offer.variantId ? { variantId: String(offer.variantId) } : {}), sellerSku: String(offer.sellerSku), fulfilmentMethod: String(offer.fulfilmentMethod), quantity, unitPriceMinor: Number(negotiation.currentUnitPriceMinor), currency: String(negotiation.currency), sourceType: "negotiation", sourceId: negotiationId, negotiationId });
}
