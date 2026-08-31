import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { ProductGallery } from "@/src/modules/catalogue/ui/product-gallery";
import { listApprovedMediaForProducts } from "@/src/modules/catalogue/server/media";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { findBusinessBuyer, listPriceTiers } from "@/src/modules/wholesale/server/repository";
import { getNegotiationSettings } from "@/src/modules/wholesale/server/negotiations";

export const dynamic = "force-dynamic";

export default async function WholesaleProductPage({ params, searchParams }: { params: Promise<{ offerId: string }>; searchParams: Promise<{ orderError?: string; negotiationError?: string }> }) {
  const [{ offerId }, query, user, pricing] = await Promise.all([params, searchParams, getCurrentAppwriteUser(), getCurrencyDisplay()]);
  const database = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID;
  const offer = await database.getDocument({ databaseId, collectionId: "seller_offers", documentId: offerId }).catch(() => null);
  if (!offer || offer.status !== "approved" || Number(offer.minimumOrderQuantity) <= 1) notFound();
  const [product, tiers, settings, buyer] = await Promise.all([
    database.getDocument({ databaseId, collectionId: "products", documentId: String(offer.productId) }),
    listPriceTiers(offerId),
    getNegotiationSettings(offerId),
    user ? findBusinessBuyer(user.$id) : null
  ]);
  if (product.status !== "approved") notFound();
  const media = (await listApprovedMediaForProducts([product.$id])).get(product.$id) ?? [];
  const approvedBuyer = buyer?.status === "approved", basePrice = Number(offer.wholesalePriceMinor ?? offer.retailPriceMinor);
  const loginHref = `/login?returnTo=${encodeURIComponent(`/wholesale/${offerId}`)}`;

  return <main className="wholesale-detail-shell">
    <nav className="wholesale-detail-nav"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div><Link href="/wholesale">← All wholesale products</Link><Link href="/wholesale/negotiations">My negotiations</Link></div></nav>
    {(query.orderError || query.negotiationError) && <div className="wholesale-detail-alert">{query.orderError ? "We could not prepare checkout. Confirm the quantity, buyer approval and available stock." : "We could not submit the negotiation. Confirm the quantity, price and required information."}</div>}
    <section className="wholesale-product-focus">
      <div className="wholesale-product-visual"><ProductGallery media={media.map(item=>({id:item.$id,altText:String(item.altText||product.name)}))} productName={String(product.name)} tone="wholesale"/><div className="wholesale-trust-row"><span>✓ Approved product</span><span>✓ Verified supply</span><span>✓ Secure payment</span></div></div>
      <div className="wholesale-product-intro"><span className="wholesale-eyebrow">WHOLESALE · {String(product.countryOfOrigin || "AF")} ORIGIN</span><h1>{String(product.name)}</h1><p>{String(product.description)}</p><div className="wholesale-price-lead"><small>Published wholesale price</small><strong>{pricing.format(basePrice, String(offer.currency))}</strong><span>per unit · MOQ {String(offer.minimumOrderQuantity)}</span></div><dl><div><dt>Seller SKU</dt><dd>{String(offer.sellerSku)}</dd></div><div><dt>Processing</dt><dd>{String(offer.processingDays)} business days</dd></div><div><dt>Fulfilment</dt><dd>{String(offer.fulfilmentMethod).replaceAll("_", " ")}</dd></div><div><dt>Maximum order</dt><dd>{offer.maximumOrderQuantity ? String(offer.maximumOrderQuantity) : "Contact seller"}</dd></div></dl></div>
    </section>

    <section className="wholesale-transaction-zone">
      <div className="wholesale-tier-panel"><span>QUANTITY PRICING</span><h2>More volume. Better value.</h2><p>The applicable tier is calculated again securely before checkout.</p><div className="wholesale-tier-list"><article><b>{String(offer.minimumOrderQuantity)}+ units</b><strong>{pricing.format(basePrice, String(offer.currency))}</strong><small>Published base tier</small></article>{tiers.documents.map(tier => <article key={tier.$id}><b>{String(tier.minimumQuantity)}{tier.maximumQuantity ? `–${String(tier.maximumQuantity)}` : "+"} units</b><strong>{pricing.format(Number(tier.unitPriceMinor), String(tier.currency))}</strong><small>per unit</small></article>)}</div></div>
      <div className="wholesale-action-panel">
        <div className="wholesale-action-heading"><span>COMPLETE YOUR TRANSACTION</span><h2>Choose how you want to buy</h2><p>Use the published price immediately or request a tailored price from the seller.</p></div>
        {!user ? <div className="wholesale-gate"><h3>Sign in as a business buyer</h3><p>Your selected product will remain the destination after sign-in.</p><Link href={loginHref}>Sign in to continue →</Link></div> : !buyer ? <div className="wholesale-gate"><h3>Business registration required</h3><p>Register your organization and return after PAC-SM approval.</p><Link href="/wholesale#buyer-registration">Register as a business buyer →</Link></div> : !approvedBuyer ? <div className="wholesale-gate"><h3>Review in progress</h3><p>Your business buyer status is <strong>{String(buyer.status).replaceAll("_", " ")}</strong>. Transaction controls unlock after approval.</p></div> : <div className="wholesale-action-options">
          <section className="listed-price-action"><div><span>OPTION 1 · FASTEST</span><h3>Buy at published wholesale price</h3><p>Create the purchase order and continue directly to delivery and payment.</p></div><form action="/api/wholesale/purchase-orders" method="post"><input type="hidden" name="offerId" value={offerId}/><label>Order quantity<input name="quantity" type="number" min={Number(offer.minimumOrderQuantity)} max={offer.maximumOrderQuantity ? Number(offer.maximumOrderQuantity) : undefined} defaultValue={Number(offer.minimumOrderQuantity)} required/></label><button>Continue to secure checkout →</button></form></section>
          {settings.enabled === "true" && <section className="negotiated-price-action"><div><span>OPTION 2 · CUSTOM TERMS</span><h3>Request a negotiated price</h3><p>Propose an additional discount. The seller can accept, reject or counter instantly on PAC-SM.</p></div><form action="/api/wholesale/negotiations" method="post"><input type="hidden" name="offerId" value={offerId}/><div className="negotiation-form-grid"><label>Quantity<input name="quantity" type="number" min={Number(settings.minimumQuantity ?? offer.minimumOrderQuantity)} max={offer.maximumOrderQuantity ? Number(offer.maximumOrderQuantity) : undefined} defaultValue={Number(settings.minimumQuantity ?? offer.minimumOrderQuantity)} required/></label><label>Proposed unit price ({String(offer.currency)})<input name="unitPrice" type="number" min="0.01" step="0.01" required/></label><label>Delivery country code<input name="deliveryCountryCode" minLength={2} maxLength={2} placeholder="NG" required/></label><label>Required delivery date<input name="requestedDeliveryAt" type="date"/></label><label className="wide">Commercial message<textarea name="message" maxLength={2000} placeholder="Explain the volume, delivery schedule or commercial reason for your proposal."/></label></div><button>Send negotiation to seller →</button></form></section>}
        </div>}
      </div>
    </section>
    <section className="wholesale-assurance"><article><span>01</span><h3>Price integrity</h3><p>Published and negotiated prices are revalidated by the server.</p></article><article><span>02</span><h3>Stock protection</h3><p>Inventory is reserved atomically when the order is created.</p></article><article><span>03</span><h3>Complete trade cycle</h3><p>Purchase order, checkout, payment and fulfilment remain linked.</p></article></section>
  </main>;
}
