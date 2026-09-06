import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { getCart } from "@/src/modules/cart/server/repository";
import { listAddresses } from "@/src/modules/customers/server/repository";
import { validateCoupon } from "@/src/modules/promotions/server/coupons";
import { isAcceptedNegotiationUsable } from "@/src/modules/wholesale/domain/negotiation";
import { publishAdminNotificationSafely } from "@/src/modules/admin-notifications/server/publisher";
import { createOrderItemCommissionAllocation, type CommissionChannel } from "@/src/modules/finance/server/commissions";
import { preorderIsOpen } from "@/src/modules/catalogue/domain/product-program";
import { validateGlobalCheckout } from "@/src/modules/global-commerce/server/checkout";

const publicId = (prefix: string) => `PAC-${prefix}-${new Date().getUTCFullYear()}-${ID.unique().slice(-10).toUpperCase()}`;

export async function checkout(userId: string, addressId: string, couponCode = "") {
  const db = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID, orderId = ID.unique();
  const [{ items }, addresses] = await Promise.all([getCart(userId), listAddresses(userId)]);
  const address=addresses.documents.find(row=>row.$id===addressId);
  if (!items.length || !address) throw new Error("Invalid checkout");
  const currency = String(items[0].currency);
  if (items.some(item => item.currency !== currency)) throw new Error("Mixed currency");
  const globalValidations=await validateGlobalCheckout(userId,items,address);
  const validationByItem=new Map(globalValidations.map(row=>[row.cartItemId,row]));
  const transaction = await db.createTransaction({ ttl: 120 });
  try {
    const verified: Array<{ item: (typeof items)[number]; categoryId: string }> = [];
    for (const item of items) {
      const [offer, product, balances] = await Promise.all([
        db.getDocument({ databaseId, collectionId: "seller_offers", documentId: String(item.offerId), transactionId: transaction.$id }),
        db.getDocument({ databaseId, collectionId: "products", documentId: String(item.productId), transactionId: transaction.$id }),
        db.listDocuments({ databaseId, collectionId: "inventory_balances", queries: [Query.equal("offerId", item.offerId), Query.limit(100)], transactionId: transaction.$id })
      ]);
      let validPrice = Number(offer.retailPriceMinor) === Number(item.unitPriceMinor), negotiationType = "";
      if (item.purchaseOrderId) {
        const [purchaseOrder, purchaseOrderItems] = await Promise.all([
          db.getDocument({ databaseId, collectionId: "purchase_orders", documentId: String(item.purchaseOrderId), transactionId: transaction.$id }),
          db.listDocuments({ databaseId, collectionId: "purchase_order_items", queries: [Query.equal("purchaseOrderId", String(item.purchaseOrderId)), Query.equal("offerId", String(item.offerId)), Query.limit(1)], transactionId: transaction.$id })
        ]);
        const purchaseOrderItem = purchaseOrderItems.documents[0];
        validPrice = purchaseOrder.buyerUserId === userId && ["submitted", "accepted"].includes(String(purchaseOrder.status)) && purchaseOrder.vendorId === item.vendorId && purchaseOrder.currency === item.currency && Number(purchaseOrder.totalMinor) === Number(item.unitPriceMinor) * Number(item.quantity) && purchaseOrderItem?.productId === item.productId && Number(purchaseOrderItem?.quantity) === Number(item.quantity) && Number(purchaseOrderItem?.unitPriceMinor) === Number(item.unitPriceMinor);
      }
      if (item.negotiationId) {
        const negotiation = await db.getDocument({ databaseId, collectionId: "price_negotiations", documentId: String(item.negotiationId), transactionId: transaction.$id });
        negotiationType = String(negotiation.negotiationType ?? "price");
        const validNegotiation = negotiation.buyerUserId === userId && negotiation.offerId === item.offerId && Number(negotiation.quantity) === Number(item.quantity) && Number(negotiation.currentUnitPriceMinor) === Number(item.unitPriceMinor) && negotiation.currency === item.currency && isAcceptedNegotiationUsable(String(negotiation.status), String(negotiation.expiresAt), negotiation.usedAt);
        validPrice = item.purchaseOrderId ? validPrice && validNegotiation : validNegotiation;
      }
      if (offer.status !== "approved" || product.status !== "approved" || !validPrice) throw new Error("Cart changed");
      const purchaseType = String(item.purchaseType ?? "standard");
      if (purchaseType === "preorder") {
        const program = await db.getDocument({ databaseId, collectionId: "product_programs", documentId: String(item.offerId), transactionId: transaction.$id });
        if (!preorderIsOpen(program) || String(program.estimatedDispatchAt) !== String(item.promisedDispatchAt)) throw new Error("Pre-order changed");
        await db.incrementDocumentAttribute({ databaseId, collectionId: "product_programs", documentId: program.$id, attribute: "preorderReserved", value: Number(item.quantity), max: Number(program.preorderCapacity), transactionId: transaction.$id });
      } else if (purchaseType === "white_label") {
        const program = await db.getDocument({ databaseId, collectionId: "product_programs", documentId: String(item.offerId), transactionId: transaction.$id }).catch(() => null);
        const negotiatedWhiteLabel = negotiationType === "white_label" && Boolean(item.negotiationId);
        if ((!negotiatedWhiteLabel && (!program?.whiteLabelEnabled || Number(item.quantity) < Number(program.whiteLabelMinimumQuantity))) || !item.brandingName || String(item.customizationBrief ?? "").length < 20) throw new Error("White-label programme changed");
      } else if(String(item.fulfilmentMethod)!=="global_direct") {
        let remaining = Number(item.quantity);
        for (const balance of balances.documents) {
          const take = Math.min(Number(balance.onHand) - Number(balance.reserved) - Number(balance.damaged), remaining);
          if (take > 0) {
            await db.incrementDocumentAttribute({ databaseId, collectionId: "inventory_balances", documentId: balance.$id, attribute: "reserved", value: take, max: Number(balance.onHand) - Number(balance.damaged), transactionId: transaction.$id });
            await db.createDocument({ databaseId, collectionId: "inventory_reservations", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId, vendorId: item.vendorId, offerId: item.offerId, warehouseId: balance.warehouseId, quantity: take, status: "active", expiresAt: new Date(Date.now() + 900000).toISOString(), createdAt: new Date().toISOString() } });
            remaining -= take;
          }
        }
        if (remaining > 0) throw new Error("Insufficient stock");
      }
      verified.push({ item, categoryId: String(product.categoryId) });
    }
    const createdAt = new Date().toISOString(), subtotal = verified.reduce((sum, row) => sum + Number(row.item.unitPriceMinor) * Number(row.item.quantity), 0), promotion = await validateCoupon(db, transaction.$id, userId, couponCode, subtotal), total = subtotal - (promotion?.discountMinor ?? 0);
    await db.createDocument({ databaseId, collectionId: "orders", documentId: orderId, permissions: [], transactionId: transaction.$id, data: { orderNumber: publicId("ORD"), customerUserId: userId, addressId, currency, subtotalMinor: subtotal, totalMinor: total, status: "pending_payment", createdAt } });
    const groups = new Map<string, typeof verified>();
    for (const row of verified) groups.set(String(row.item.vendorId), [...(groups.get(String(row.item.vendorId)) ?? []), row]);
    for (const [vendorId, rows] of groups) {
      const vendorOrderId = ID.unique(), vendorSubtotal = rows.reduce((sum, row) => sum + Number(row.item.unitPriceMinor) * Number(row.item.quantity), 0);
      await db.createDocument({ databaseId, collectionId: "vendor_orders", documentId: vendorOrderId, permissions: [], transactionId: transaction.$id, data: { orderId, vendorId, vendorOrderNumber: publicId("VORD"), currency, subtotalMinor: vendorSubtotal, status: "new", createdAt } });
      for (const { item, categoryId } of rows) {
        const orderItemId = ID.unique(), lineTotalMinor = Number(item.unitPriceMinor) * Number(item.quantity);
        await db.createDocument({ databaseId, collectionId: "order_items", documentId: orderItemId, permissions: [], transactionId: transaction.$id, data: { orderId, vendorOrderId, vendorId, productId: item.productId, ...(item.variantId ? { variantId: item.variantId } : {}), offerId: item.offerId, ...(item.negotiationId ? { negotiationId: item.negotiationId } : {}), ...(item.purchaseOrderId ? { purchaseOrderId: item.purchaseOrderId } : {}), ...(item.purchaseType ? { purchaseType: item.purchaseType } : {}), ...(item.promisedDispatchAt ? { promisedDispatchAt: item.promisedDispatchAt } : {}), ...(item.brandingName ? { brandingName: item.brandingName } : {}), ...(item.customizationBrief ? { customizationBrief: item.customizationBrief } : {}), productName: item.productName, sellerSku: item.sellerSku, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, lineTotalMinor, currency } });
        const channel: CommissionChannel = vendorId === "pacsm-platform" ? "pacsm_products" : item.negotiationId ? "negotiated_wholesale" : item.purchaseOrderId ? "wholesale" : "retail";
        await createOrderItemCommissionAllocation(db, databaseId, transaction.$id, { orderId, vendorOrderId, orderItemId, vendorId, productId: String(item.productId), categoryId, channel, grossMinor: lineTotalMinor, currency, calculatedAt: createdAt });
      }
      const supplierGroups=new Map<string,typeof rows>();for(const row of rows){const validation=validationByItem.get(row.item.$id);if(validation)supplierGroups.set(validation.supplierId,[...(supplierGroups.get(validation.supplierId)??[]),row])}
      for(const[supplierId,globalRows]of supplierGroups){const validations=globalRows.map(row=>validationByItem.get(row.item.$id)!);await db.createDocument({databaseId,collectionId:"global_fulfilment_groups",documentId:ID.unique(),permissions:[],transactionId:transaction.$id,data:{orderId,vendorOrderId,supplierId,destinationCountry:validations[0].destinationCountry,currency,itemCount:globalRows.length,totalMinor:globalRows.reduce((sum,row)=>sum+Number(row.item.unitPriceMinor)*Number(row.item.quantity),0),status:"awaiting_payment",validationIds:JSON.stringify(validations.map(row=>row.id)),createdAt,updatedAt:createdAt}});for(const validation of validations)await db.updateDocument({databaseId,collectionId:"global_checkout_validations",documentId:validation.id,transactionId:transaction.$id,data:{status:"converted_to_order",orderId}})}
    }
    for (const { item } of verified) {
      if (item.negotiationId) await db.updateDocument({ databaseId, collectionId: "price_negotiations", documentId: String(item.negotiationId), transactionId: transaction.$id, data: { status: "converted_to_order", orderId, usedAt: createdAt, updatedAt: createdAt } });
      if (item.purchaseOrderId) await db.updateDocument({ databaseId, collectionId: "purchase_orders", documentId: String(item.purchaseOrderId), transactionId: transaction.$id, data: { status: "converted_to_order", orderId, convertedAt: createdAt } });
    }
    if (promotion) {
      await db.incrementDocumentAttribute({ databaseId, collectionId: "coupons", documentId: promotion.coupon.$id, attribute: "uses", value: 1, max: Number(promotion.coupon.maximumUses), transactionId: transaction.$id });
      await db.createDocument({ databaseId, collectionId: "coupon_redemptions", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { couponId: promotion.coupon.$id, code: promotion.coupon.code, userId, orderId, discountMinor: promotion.discountMinor, redeemedAt: createdAt } });
    }
    await db.createDocument({ databaseId, collectionId: "order_events", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { orderId, eventType: "order_created", actorUserId: userId, metadata: JSON.stringify({ vendors: groups.size, coupon: promotion?.coupon.code ?? null, discountMinor: promotion?.discountMinor ?? 0, negotiations: verified.filter(row => row.item.negotiationId).map(row => row.item.negotiationId), purchaseOrders: verified.filter(row => row.item.purchaseOrderId).map(row => row.item.purchaseOrderId) }), occurredAt: createdAt } });
    await db.createDocument({ databaseId, collectionId: "notifications", documentId: ID.unique(), permissions: [], transactionId: transaction.$id, data: { userId, type: "order", title: "Order created", body: "Your stock is reserved and awaiting payment.", href: `/orders/${orderId}`, createdAt } });
    for (const item of items) await db.deleteDocument({ databaseId, collectionId: "cart_items", documentId: item.$id, transactionId: transaction.$id });
    await db.updateTransaction({ transactionId: transaction.$id, commit: true });
    await publishAdminNotificationSafely({eventType:"order_created",priority:"information",title:"New marketplace order",body:`Order ${orderId} was created and is awaiting payment.`,entityType:"order",entityId:orderId,href:`/admin/orders?orderId=${orderId}`,roles:["order_fulfilment_manager"]});
    return orderId;
  } catch (error) {
    await db.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw error;
  }
}
