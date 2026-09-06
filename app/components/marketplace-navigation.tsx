import Link from "next/link";

export default function MarketplaceNavigation({ allCategories = "All Categories", sell = "Sell on PAC-SM" }: { allCategories?: string; sell?: string }) {
  return <nav className="market-nav" aria-label="Marketplace navigation">
    <Link className="all-categories" href="/products">☰ {allCategories}</Link>
    <Link href="/pac-sm-products">PAC-SM Products</Link>
    <Link className="global-stores-link" href="/global-stores">🌐 Global Stores</Link>
    <details><summary>Shop <span>⌄</span></summary><div className="market-mega-menu">
      <section><b>Ways to buy</b><Link href="/products?market=retail">Retail marketplace</Link><Link href="/wholesale">Wholesale marketplace</Link><Link href="/pre-orders">Pre-order products</Link><Link href="/white-label">White-label sourcing</Link></section>
      <section><b>Curated collections</b><Link href="/brands">Shop by company</Link><Link href="/products">Today&apos;s deals</Link><Link href="/pac-sm-products">PAC-SM house products</Link><Link href="/global-stores">Imported global products</Link></section>
    </div></details>
    <details><summary>Trade &amp; source <span>⌄</span></summary><div className="market-mega-menu">
      <section><b>Commercial services</b><Link href="/offtakers">Off-taker Centre</Link><Link href="/procurement">Procurement</Link><Link href="/seller/trade">Cross-border trade</Link><Link href="/logistics">Logistics</Link></section>
      <section><b>Grow on PAC-SM</b><Link href="/academy">Trade Academy</Link><Link href="/vendor/register">Become a seller</Link><Link href="/seller/products">Upload products</Link><Link href="/track">Track shipment</Link></section>
    </div></details>
    <Link className="sell-cta" href="/vendor/register">{sell}</Link>
  </nav>;
}
