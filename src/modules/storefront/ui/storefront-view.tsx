import Link from "next/link";
import Image from "next/image";
import { ProductImage } from "@/src/modules/catalogue/ui/product-image";

type Item = { product: Record<string, unknown> & { $id: string }; offer: Record<string, unknown>; media?: ({ $id: string; altText?: unknown } & Record<string, unknown>) | null; available?: number };
export function StorefrontView({ store, items, format }: { store: Record<string, unknown> & { $id?: string }; items: Item[]; format: (amount: number, currency: string) => string }) {
  const primary = /^#[0-9A-F]{6}$/i.test(String(store.themePrimary ?? "")) ? String(store.themePrimary) : "#075E54";
  const accent = /^#[0-9A-F]{6}$/i.test(String(store.themeAccent ?? "")) ? String(store.themeAccent) : "#F4B400";
  return <main className="uniform-storefront" style={{ "--store-primary": primary, "--store-accent": accent } as React.CSSProperties}>
    <nav className="storefront-nav"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div><Link href="/products">Marketplace</Link><Link href="/cart">Cart</Link></div></nav>
    <header className="storefront-hero"><div className="storefront-identity">{store.logoFileId && store.$id ? <Image unoptimized width={112} height={112} src={`/api/storefront/logo/${store.$id}`} alt={String(store.logoAltText ?? `${store.name} logo`)}/> : <span>{String(store.name).slice(0, 2).toUpperCase()}</span>}<div><p>VERIFIED PAC-SM STOREFRONT</p><h1>{String(store.name)}</h1><small>{String(store.tagline ?? "Trusted products from an approved continental seller")}</small></div></div><Link className="storefront-cta" href="/products">Explore marketplace</Link></header>
    <section className="storefront-benefits"><span>✓ Verified seller</span><span>◆ Secure checkout</span><span>↗ Continental delivery</span><span>◎ Buyer protection</span></section>
    <section className="storefront-title"><div><p>STORE COLLECTION</p><h2>Products from {String(store.name)}</h2></div><span>{items.length} listing{items.length === 1 ? "" : "s"}</span></section>
    <section className="storefront-products">{items.length ? items.map(item => <Link href={`/products/${String(item.product.slug)}`} key={item.product.$id}><article><ProductImage media={item.media} productName={String(item.product.name)} className="storefront-product-image"/><span>{Number(item.offer.minimumOrderQuantity) > 1 ? `WHOLESALE · MOQ ${item.offer.minimumOrderQuantity}` : "RETAIL"}</span><h3>{String(item.product.name)}</h3><p>{String(item.product.description ?? "").slice(0, 115)}</p><strong>{format(Number(item.offer.retailPriceMinor), String(item.offer.currency))}</strong>{typeof item.available === "number" && <small>{item.available > 0 ? `${item.available} available` : "Temporarily unavailable"}</small>}</article></Link>) : <div className="storefront-empty"><h2>This collection is being prepared.</h2><p>Approved products will appear here as soon as they are published.</p></div>}</section>
  </main>;
}
