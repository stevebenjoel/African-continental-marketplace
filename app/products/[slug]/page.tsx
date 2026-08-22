import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@/src/modules/catalogue/server/repository";
import { listProductReviews } from "@/src/modules/engagement/server/reviews";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { ProductImage } from "@/src/modules/catalogue/ui/product-image";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ reviewed?: string; reviewError?: string; saved?: string }> }) {
  const [{ slug }, query, user, pricing] = await Promise.all([params, searchParams, getCurrentAppwriteUser(), getCurrencyDisplay()]);
  const data = await getPublicProduct(slug);
  if (!data) notFound();
  const reviews = await listProductReviews(data.product.$id);
  const average = reviews.documents.length ? reviews.documents.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.documents.length : 0;

  return <main className="marketplace-shell">
    <nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div><Link href="/products">All products</Link> · <Link href="/wishlist">Wishlist</Link> · <Link href="/cart">Cart</Link></div></nav>
    <section className="product-detail">
      <div className="product-gallery"><ProductImage media={data.media[0]} productName={String(data.product.name)} className="product-hero-mark"/>{data.media.length > 1 && <div className="product-thumbnails">{data.media.map(media => <ProductImage key={media.$id} media={media} productName={String(data.product.name)} className="product-thumbnail"/>)}</div>}</div>
      <div><p className="kicker">{String(data.product.brandName ?? "VERIFIED PRODUCT")}</p><h1>{String(data.product.name)}</h1><p className="product-description">{String(data.product.description)}</p><p>{reviews.total ? `${average.toFixed(1)} / 5 from ${reviews.total} verified review(s)` : "No reviews yet"}</p><dl><dt>Country of origin</dt><dd>{String(data.product.countryOfOrigin)}</dd><dt>Model</dt><dd>{String(data.product.model ?? "Not specified")}</dd></dl>{user ? <form action="/api/wishlist" method="post"><input type="hidden" name="productId" value={data.product.$id}/><input type="hidden" name="returnTo" value={`/products/${slug}?saved=1`}/><button type="submit">Save to wishlist</button></form> : <Link href={`/login?returnTo=/products/${slug}`}>Sign in to save</Link>}{query.saved && <p className="success-note">Saved to your wishlist.</p>}</div>
    </section>
    <section className="offer-list"><h2>Seller offers · displayed in {pricing.currency}</h2>{data.offers.map(({ offer, store, available }) => <article key={offer.$id}><div><strong>{String(store.name)}</strong><Link href={`/store/${String(store.slug)}`}>View store</Link></div><div><span>{Number(offer.minimumOrderQuantity) > 1 ? `Wholesale · MOQ ${String(offer.minimumOrderQuantity)}` : "Retail"}</span><strong>{pricing.format(Number(offer.retailPriceMinor), String(offer.currency))}</strong><span>{available > 0 ? `${available} in stock` : "Out of stock"}</span><form method="post" action="/api/cart/items"><input type="hidden" name="offerId" value={offer.$id}/><input type="hidden" name="productSlug" value={slug}/><input aria-label="Quantity" name="quantity" type="number" min={Number(offer.minimumOrderQuantity)} max={available} defaultValue={Number(offer.minimumOrderQuantity)}/><button disabled={available < Number(offer.minimumOrderQuantity)}>Add to cart</button></form></div></article>)}</section>
    <section className="cart-vendor"><h2>Verified-purchase reviews</h2>{query.reviewed && <p className="success-note">Review published.</p>}{query.reviewError && <p className="form-error">A delivered purchase is required, and each product can only be reviewed once.</p>}{reviews.documents.map(review => <article key={review.$id}><div><strong>{"★".repeat(Number(review.rating))} {String(review.title)}</strong><p>{String(review.body)}</p></div></article>)}{user ? <form className="stack-form" action="/api/reviews" method="post"><input type="hidden" name="productId" value={data.product.$id}/><input type="hidden" name="slug" value={slug}/><label>Rating<select name="rating" required><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label><label>Title<input name="title" required minLength={3} maxLength={160}/></label><label>Review<textarea name="body" required minLength={10} maxLength={2000}/></label><button type="submit">Publish verified review</button></form> : <Link href={`/login?returnTo=/products/${slug}`}>Sign in to review a delivered purchase</Link>}</section>
  </main>;
}
