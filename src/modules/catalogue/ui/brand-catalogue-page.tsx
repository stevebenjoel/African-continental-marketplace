import Link from "next/link";
import type { CSSProperties } from "react";
import type { BrandCatalogueDefinition } from "@/src/modules/catalogue/domain/brand-catalogue";
import { listPublicBrandProducts } from "@/src/modules/catalogue/server/repository";
import { ProductImage } from "@/src/modules/catalogue/ui/product-image";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import styles from "./brand-catalogue-page.module.css";

export async function BrandCataloguePage({ brand }: { brand: BrandCatalogueDefinition }) {
  const [items, pricing] = await Promise.all([listPublicBrandProducts(brand.aliases), getCurrencyDisplay()]);
  const categories = new Set(items.map(item => String(item.product.categoryId)));
  return <main className={styles.page} style={{ "--brand-accent": brand.accent } as CSSProperties}>
    <nav className={styles.nav}><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div className={styles.navLinks}><Link href="/products">Retail</Link><Link href="/wholesale">Wholesale</Link><Link href="/store/diplomats-stores">Diplomats Stores</Link><Link href="/cart">Cart</Link></div></nav>
    <header className={styles.hero}><div><span className={styles.eyebrow}>AUTHORIZED MARKETPLACE COLLECTION</span><h1>{brand.headline}</h1><p>{brand.description}</p></div><aside><span>{brand.name.toUpperCase()} CATALOGUE</span><strong>{items.length}</strong><small>published product{items.length === 1 ? "" : "s"} · {categories.size} PAC-SM categor{categories.size === 1 ? "y" : "ies"}</small><Link href="/store/diplomats-stores">Sold by Diplomats Stores →</Link></aside></header>
    <section className={styles.trust}><span>✓ Diplomats Stores accounting owner</span><span>▣ Protected PAC-SM checkout</span><span>↗ Tracked fulfilment and delivery</span></section>
    <section className={styles.section}><div className={styles.heading}><div><span>{brand.name.toUpperCase()}</span><h2>Explore the collection</h2></div><p>Prices are displayed in {pricing.currency}. Stock becomes purchasable only after Diplomats Stores confirms physical inventory.</p></div><div className={styles.grid}>{items.length ? items.map(item => <article className={styles.card} key={item.product.$id}><div className={styles.media}><ProductImage media={item.media} productName={String(item.product.name)} className={styles.media}/></div><small>{String(item.product.model ?? brand.name)}</small><h2>{String(item.product.name)}</h2><p>{String(item.product.description).slice(0, 125)}</p><strong>{pricing.format(Number(item.offer.retailPriceMinor), String(item.offer.currency))}</strong><span className={styles.stock}>{item.available > 0 ? `${item.available} available` : "Awaiting confirmed inventory"}</span><Link href={`/products/${String(item.product.slug)}`}>View product →</Link></article>) : <div className={styles.empty}><h2>This brand collection is being prepared.</h2><p>Validated products will appear after the catalogue import is completed.</p><Link href="/products">Browse the marketplace</Link></div>}</div></section>
  </main>;
}
