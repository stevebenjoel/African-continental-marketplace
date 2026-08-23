import Link from "next/link";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findBusinessBuyer, listBuyerPurchaseOrders, listPriceTiers, listWholesaleOffers } from "@/src/modules/wholesale/server/repository";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { listApprovedMediaForProducts } from "@/src/modules/catalogue/server/media";
import { ProductImage } from "@/src/modules/catalogue/ui/product-image";

export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const [user, offers, pricing] = await Promise.all([getCurrentAppwriteUser(), listWholesaleOffers(), getCurrencyDisplay()]);
  const buyer = user ? await findBusinessBuyer(user.$id) : null;
  const database = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID;
  const products = await Promise.all(offers.documents.map(offer => database.getDocument({ databaseId, collectionId: "products", documentId: String(offer.productId) })));
  const [tiers, mediaByProduct, orders] = await Promise.all([
    Promise.all(offers.documents.map(offer => listPriceTiers(offer.$id))),
    listApprovedMediaForProducts(products.map(product => product.$id)),
    user ? listBuyerPurchaseOrders(user.$id) : null
  ]);

  return <main className="marketplace-shell wholesale-marketplace">
    <nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div><Link href="/products">Retail</Link><Link href="/wholesale/negotiations">My negotiations</Link></div></nav>
    <header className="wholesale-hero"><div><p className="kicker">PAC-SM WHOLESALE</p><h1>Source at scale.<br/><em>Trade with confidence.</em></h1><p>Open a product to compare quantity tiers, buy at the published wholesale price or negotiate a tailored commercial offer.</p></div><aside><span>FOR APPROVED BUSINESS BUYERS</span><strong>{offers.total}</strong><p>verified wholesale offers</p><Link href="/wholesale/negotiations">Track negotiations →</Link></aside></header>

    {!user ? <section className="wholesale-access-card"><div><span>BUSINESS BUYER ACCESS</span><h2>Sign in to purchase or negotiate.</h2><p>Browse every offer now, then sign in to begin a verified wholesale transaction.</p></div><Link href="/login?returnTo=/wholesale">Sign in →</Link></section> : !buyer ? <section className="wholesale-access-card" id="buyer-registration"><div><span>OPEN WHOLESALE ACCESS</span><h2>Register your organization.</h2><p>Submit a short business-buyer application before purchasing or negotiating.</p></div><form className="wholesale-registration-form" action="/api/wholesale/buyers" method="post"><input name="organizationName" aria-label="Organization" placeholder="Organization" required/><input name="registrationNumber" aria-label="Registration number" placeholder="Registration number" required/><input name="countryCode" aria-label="Country code" placeholder="Country code" required minLength={2} maxLength={2}/><select name="buyerType" aria-label="Buyer type"><option value="retailer">Retailer</option><option value="distributor">Distributor</option><option value="institution">Institution</option><option value="manufacturer">Manufacturer</option></select><button>Submit for approval</button></form></section> : <section className={`wholesale-status ${buyer.status === "approved" ? "approved" : "pending"}`}><span>BUSINESS BUYER STATUS</span><strong>{String(buyer.status).replaceAll("_", " ")}</strong><p>{buyer.status === "approved" ? "Your organization can purchase published tiers and submit price negotiations." : "You can browse offers while PAC-SM completes the business review."}</p></section>}

    <section className="wholesale-section-heading"><div><span>VERIFIED BULK SUPPLY</span><h2>Choose a wholesale product</h2></div><p>Each selected product opens in a dedicated full-screen transaction workspace.</p></section>
    <section className="wholesale-card-grid">{offers.documents.map((offer, index) => { const product = products[index], offerTiers = tiers[index].documents, bestTier = offerTiers.at(-1); return <Link className="wholesale-card" href={`/wholesale/${offer.$id}`} key={offer.$id}><ProductImage media={mediaByProduct.get(product.$id)?.[0]} productName={String(product.name)} className="wholesale-card-image"/><div className="wholesale-card-body"><div className="wholesale-card-meta"><span>MOQ {String(offer.minimumOrderQuantity)}</span><span>{String(product.countryOfOrigin || "AF")} origin</span></div><h2>{String(product.name)}</h2><p>{String(product.description)}</p><div className="wholesale-card-price"><small>Starting from</small><strong>{pricing.format(Number(offer.wholesalePriceMinor ?? offer.retailPriceMinor), String(offer.currency))}</strong>{bestTier && <span>Best tier: {pricing.format(Number(bestTier.unitPriceMinor), String(bestTier.currency))}</span>}</div><b>Open product & transact →</b></div></Link>; })}</section>

    {orders && <section className="wholesale-orders" id="purchase-orders"><div className="wholesale-section-heading"><div><span>COMMERCIAL RECORDS</span><h2>Your purchase orders</h2></div><Link href="/orders">Marketplace orders →</Link></div>{orders.documents.length ? <div className="wholesale-order-list">{orders.documents.map(order => <article key={order.$id}><div><span>{String(order.purchaseOrderNumber)}</span><strong>{String(order.status).replaceAll("_", " ")}</strong></div><b>{new Intl.NumberFormat("en", { style: "currency", currency: String(order.currency) }).format(Number(order.totalMinor) / 100)}</b><small>{new Date(String(order.createdAt)).toLocaleDateString("en-GB")}</small></article>)}</div> : <p className="empty-market">No purchase orders yet. Open a wholesale product to start a transaction.</p>}</section>}
  </main>;
}
