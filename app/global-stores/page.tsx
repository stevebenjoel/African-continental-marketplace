import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, listPublicGlobalProducts } from "@/src/modules/catalogue/server/repository";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { ProductImage } from "@/src/modules/catalogue/ui/product-image";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Global Stores", description: "Shop PAC-SM-approved products sourced from connected global suppliers and fulfilled through Diplomats Stores.", alternates: { canonical: "/global-stores" } };
type Query = { q?: string; category?: string; sort?: string; availability?: string };

export default async function GlobalStoresPage({ searchParams }: { searchParams: Promise<Query> }) {
  const filters = await searchParams;
  const [products, categories, pricing] = await Promise.all([listPublicGlobalProducts(filters), listCategories(), getCurrencyDisplay()]);
  const activeCategory = categories.documents.find(category => category.$id === filters.category);
  const href = (category = "") => `/global-stores?${new URLSearchParams(Object.entries({ ...filters, category }).filter(([, value]) => value) as [string, string][]).toString()}`;
  return <main className="global-storefront">
    <header className="global-storefront-header"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><form action="/global-stores"><input name="q" defaultValue={filters.q} placeholder="Search Global Stores" aria-label="Search Global Stores"/><input type="hidden" name="category" value={filters.category ?? ""}/><button>Search</button></form><nav><Link href="/products">All marketplace</Link><Link href="/cart">Cart</Link><Link href="/account">My account</Link></nav></header>
    <section className="global-storefront-hero"><div><span>CONNECTED GLOBAL SUPPLY · MANAGED BY DIPLOMATS STORES</span><h1>Global products, prepared for trusted PAC-SM shopping.</h1><p>Browse supplier products only after PAC-SM pricing, catalogue approval and fulfilment checks are complete. Every item remains protected by the normal cart, payment and order workflow.</p><div><Link href="#global-products">Shop approved products</Link><Link href="/documentation#global-stores">How Global Stores works</Link></div></div><aside><strong>{products.length}</strong><span>approved global product{products.length === 1 ? "" : "s"}</span><small>Displayed in {pricing.currency}</small></aside></section>
    <nav className="global-category-nav" aria-label="Global product categories"><Link className={!filters.category ? "active" : ""} href={href()}>All global products</Link>{categories.documents.map(category => <Link className={filters.category === category.$id ? "active" : ""} href={href(category.$id)} key={category.$id}>{String(category.name)}</Link>)}</nav>
    <section className="global-products-section" id="global-products"><header><div><span>APPROVED GLOBAL CATALOGUE</span><h2>{activeCategory ? String(activeCategory.name) : "Explore Global Stores"}</h2></div><p>{products.length} result{products.length === 1 ? "" : "s"}</p></header>
      {products.length ? <div className="retail-product-grid">{products.map(item => { const slug = String(item.product.slug), wholesale = Number(item.offer.minimumOrderQuantity) > 1; return <article className="retail-product-card" key={item.product.$id}><Link className="retail-product-media" href={`/products/${slug}`}><ProductImage media={item.media} productName={String(item.product.name)} className="retail-product-image"/><span className="retail-card-badge">GLOBAL STORE</span></Link><div className="retail-product-copy"><span>{String(item.product.brandName ?? "Global supplier")}</span><Link href={`/products/${slug}`}><h2>{String(item.product.name)}</h2></Link><div className="retail-rating"><b>★★★★★</b><small>PAC-SM approved</small></div><strong className="retail-price">{pricing.format(Number(item.offer.retailPriceMinor), String(item.offer.currency))}</strong><p>{item.available > 0 ? `${item.available} available` : wholesale ? "Supplier fulfilment available" : "Preparing stock"}</p><div className="retail-card-actions"><Link className="retail-card-cta" href={`/products/${slug}`}>View product <span>→</span></Link></div></div></article>; })}</div> : <div className="global-empty"><span>🌐</span><h2>Global products are being prepared</h2><p>CJ imports appear here automatically after Phase 4 pricing, catalogue approval and an approved offer. Imported drafts remain private so customers never see an item that cannot complete checkout.</p><Link href="/products">Continue shopping the PAC-SM marketplace</Link></div>}
    </section>
  </main>;
}
