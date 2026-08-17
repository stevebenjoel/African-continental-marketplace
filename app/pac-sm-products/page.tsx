import Link from "next/link";
import { listPacsmProducts } from "@/src/modules/catalogue/server/repository";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";

export const dynamic = "force-dynamic";

export default async function PacsmProductsPage() {
  const [products, pricing] = await Promise.all([listPacsmProducts(), getCurrencyDisplay()]);

  return <main className="marketplace-shell">
    <nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div><Link href="/products">All marketplace products</Link> · <Link href="/cart">Cart</Link></div></nav>
    <header>
      <p className="kicker">PAC-SM HOUSE COLLECTION</p>
      <h1>PAC-SM Products.</h1>
      <p>Explore our growing collection of African agro commodities, packaged foods and beverages for retail customers and wholesale buyers. Prices are displayed in {pricing.currency}.</p>
      <div className="doc-audiences"><span>Agro products</span><span>Food</span><span>Beverages</span><span>Retail</span><span>Wholesale</span></div>
    </header>
    <section className="service-ribbon">
      <article><span>✓</span><div><strong>PAC-SM selected</strong><small>House-brand product range</small></div></article>
      <article><span>◎</span><div><strong>African origin</strong><small>Continental producer network</small></div></article>
      <article><span>□</span><div><strong>Quality controlled</strong><small>Reviewed catalogue listings</small></div></article>
      <article><span>↗</span><div><strong>Trade ready</strong><small>Retail and bulk opportunities</small></div></article>
    </section>
    <section className="product-grid">
      {products.length ? products.map(item => item && <Link href={`/products/${String(item.product.slug)}`} key={item.product.$id}><article>
        <div className="product-placeholder">{String(item.product.name).slice(0, 2).toUpperCase()}</div>
        <span>{Number(item.offer.minimumOrderQuantity) > 1 ? `WHOLESALE · MOQ ${String(item.offer.minimumOrderQuantity)}` : "PAC-SM RETAIL"}</span>
        <h2>{String(item.product.name)}</h2>
        <p>{String(item.product.description)}</p>
        <strong>{pricing.format(Number(item.offer.retailPriceMinor), String(item.offer.currency))}</strong>
        <p>{item.available > 0 ? `${item.available} available` : "Currently unavailable"}</p>
      </article></Link>) : <div className="empty-market"><h2>Our collection is being prepared.</h2><p>Approved PAC-SM agro, food and beverage products will appear here as they are added from the admin catalogue.</p><Link href="/products">Browse the wider marketplace →</Link></div>}
    </section>
  </main>;
}
