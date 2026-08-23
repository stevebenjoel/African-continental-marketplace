import Link from "next/link";

type Module = "offtakers" | "procurement" | "trade" | "logistics";
const links = [
  { href: "/offtakers", label: "Off-takers", id: "offtakers" },
  { href: "/procurement", label: "Procurement", id: "procurement" },
  { href: "/seller/trade", label: "Trade", id: "trade" },
  { href: "/logistics", label: "Logistics", id: "logistics" }
] as const;

export function CommerceModuleHeader({ current, utility }: { current: Module; utility?: { href: string; label: string } }) {
  return <header className="module-topbar"><div className="module-topbar-main"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><nav aria-label="Continental commerce modules">{links.map(link => <Link className={current === link.id ? "active" : ""} href={link.href} key={link.id}>{link.label}</Link>)}</nav><div className="module-utility"><Link href="/products?market=retail">Marketplace</Link><Link href={utility?.href ?? "/account"}>{utility?.label ?? "My account"}</Link></div></div></header>;
}

export function CommerceModuleHero({ eyebrow, title, description, metric, metricLabel, tone = "green", children }: { eyebrow: string; title: string; description: string; metric?: string | number; metricLabel?: string; tone?: "green" | "orange" | "gold" | "blue"; children?: React.ReactNode }) {
  return <section className={`module-hero module-hero-${tone}`}><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span>{children}</div>{metric !== undefined && <aside><strong>{metric}</strong><small>{metricLabel}</small></aside>}</section>;
}
