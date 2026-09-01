import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { BRAND_CATALOGUES } from "@/src/modules/catalogue/domain/brand-catalogue";
import styles from "./brands.module.css";

export const metadata: Metadata = {
  title: "Shop by Company",
  description: "Browse product collections from Thermocool, LG, Panasonic and other companies on PAC-SM.",
  alternates: { canonical: "/brands" }
};

export default function BrandsPage() {
  return <main className={styles.page}>
    <nav className={styles.nav}><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/products">Browse all products</Link></nav>
    <header className={styles.hero}><span>COMPANY PRODUCT COLLECTIONS</span><h1>Shop by company</h1><p>Go directly to a company catalogue, compare its products and complete your purchase through PAC-SM.</p></header>
    <section className={styles.section} aria-labelledby="company-directory-title"><div className={styles.heading}><div><span>TRUSTED NAMES</span><h2 id="company-directory-title">Company directory</h2></div><p>New company collections become purchasable as their approved products and confirmed inventory are published.</p></div><div className={styles.grid}>{BRAND_CATALOGUES.map(brand => <Link className={styles.card} href={`/brands/${brand.slug}`} key={brand.slug} style={{ "--company-accent": brand.accent } as CSSProperties}><div className={styles.wordmark}>{brand.name}</div><span className={brand.available ? styles.live : styles.soon}>{brand.available ? "Products available" : "Catalogue coming soon"}</span><h2>{brand.name} products</h2><p>{brand.description}</p><b>Open company page →</b></Link>)}</div></section>
  </main>;
}
