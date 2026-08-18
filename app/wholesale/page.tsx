import Link from "next/link";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findBusinessBuyer, listBuyerPurchaseOrders, listPriceTiers, listWholesaleOffers } from "@/src/modules/wholesale/server/repository";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { getNegotiationSettings } from "@/src/modules/wholesale/server/negotiations";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const [user, offers, pricing] = await Promise.all([getCurrentAppwriteUser(), listWholesaleOffers(), getCurrencyDisplay()]);
  const buyer = user ? await findBusinessBuyer(user.$id) : null;
  const db = createAppwriteDatabaseClient().databases;
  const databaseId = env().APPWRITE_DATABASE_ID;
  const products = await Promise.all(offers.documents.map(offer => db.getDocument({ databaseId, collectionId: "products", documentId: String(offer.productId) })));
  const tiers = await Promise.all(offers.documents.map(offer => listPriceTiers(offer.$id)));
  const negotiationSettings = await Promise.all(offers.documents.map(offer => getNegotiationSettings(offer.$id)));
  const orders = user ? await listBuyerPurchaseOrders(user.$id) : null;

  return <main className="marketplace-shell">
    <nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/products">Retail marketplace</Link></nav>
    <header><p className="kicker">PAC-SM WHOLESALE</p><h1>Bulk sourcing for African businesses.</h1><p>Quantity pricing, purchase orders, seller-issued proforma invoices and auditable price negotiation. Offer prices are displayed in {pricing.currency}.</p><Link href="/wholesale/negotiations">My price negotiations →</Link></header>
    {!user ? <section className="cart-vendor"><Link href="/login?returnTo=/wholesale">Sign in to become a business buyer</Link></section> : !buyer ? <section className="cart-vendor"><h2>Register as a business buyer</h2><form className="stack-form" action="/api/wholesale/buyers" method="post"><label>Organization<input name="organizationName" required/></label><label>Registration number<input name="registrationNumber" required/></label><label>Country code<input name="countryCode" required minLength={2} maxLength={2}/></label><label>Buyer type<select name="buyerType"><option value="retailer">Retailer</option><option value="distributor">Distributor</option><option value="institution">Institution</option><option value="manufacturer">Manufacturer</option></select></label><button>Submit for approval</button></form></section> : <p className="admin-notice">Business buyer status: <strong>{String(buyer.status).replaceAll("_", " ")}</strong></p>}
    <section className="product-grid">{offers.documents.map((offer, index) => <article key={offer.$id}><div className="product-placeholder">{String(products[index].name).slice(0, 2).toUpperCase()}</div><span>MOQ {String(offer.minimumOrderQuantity)}</span><h2>{String(products[index].name)}</h2><strong>From {pricing.format(Number(offer.wholesalePriceMinor ?? offer.retailPriceMinor), String(offer.currency))}</strong>{tiers[index].documents.map(tier => <p key={tier.$id}>{String(tier.minimumQuantity)}+ units: {pricing.format(Number(tier.unitPriceMinor), String(tier.currency))}</p>)}{buyer?.status === "approved" && <form action="/api/wholesale/purchase-orders" method="post"><input type="hidden" name="offerId" value={offer.$id}/><input name="quantity" type="number" min={Number(offer.minimumOrderQuantity)} defaultValue={Number(offer.minimumOrderQuantity)} required/><button>Create purchase order</button></form>}{buyer?.status === "approved" && negotiationSettings[index]?.enabled === "true" && <details><summary>Negotiate a better price</summary><form className="stack-form" action="/api/wholesale/negotiations" method="post"><input type="hidden" name="offerId" value={offer.$id}/><label>Quantity<input name="quantity" type="number" min={Number(negotiationSettings[index]?.minimumQuantity ?? offer.minimumOrderQuantity)} defaultValue={Number(negotiationSettings[index]?.minimumQuantity ?? offer.minimumOrderQuantity)} required/></label><label>Requested unit price ({String(offer.currency)})<input name="unitPrice" type="number" min="0.01" step="0.01" required/></label><label>Delivery country code<input name="deliveryCountryCode" minLength={2} maxLength={2} required/></label><label>Required delivery date<input name="requestedDeliveryAt" type="date"/></label><label>Message<textarea name="message" maxLength={2000}/></label><button>Send negotiation request</button></form></details>}</article>)}</section>
    {orders && <section className="review-table"><div className="review-row review-head"><span>Purchase order</span><span>Status</span><span>Total</span><span>Date</span></div>{orders.documents.map(order => <div className="review-row" key={order.$id}><strong>{String(order.purchaseOrderNumber)}</strong><span>{String(order.status)}</span><span>{new Intl.NumberFormat("en", { style: "currency", currency: String(order.currency) }).format(Number(order.totalMinor) / 100)}</span><span>{new Date(String(order.createdAt)).toLocaleDateString("en-GB")}</span></div>)}</section>}
  </main>;
}
