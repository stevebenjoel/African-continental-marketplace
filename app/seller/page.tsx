import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findVendorByOwner, getVendorBundle } from "@/src/modules/vendors/server/repository";

export const dynamic = "force-dynamic";
const plannedModules = ["My Store", "Returns", "Logistics", "Team"];
const activeModules = [
  { name: "Compliance", href: "/seller/compliance", label: "Standards and certifications" },
  { name: "Integrations", href: "/seller/integrations", label: "Manage API and webhooks" },
  { name: "Trade Passport", href: "/seller/trade", label: "Manage export readiness" },
  { name: "Products", href: "/seller/products", label: "Manage catalogue" },
  { name: "Inventory", href: "/seller/inventory", label: "Manage stock" },
  { name: "Orders", href: "/seller/orders", label: "View orders" },
  { name: "Finance", href: "/seller/finance", label: "View balance" },
  { name: "Disputes", href: "/seller/disputes", label: "View cases" },
  { name: "Analytics", href: "/seller/analytics", label: "View performance" },
  { name: "RFQs", href: "/seller/rfqs", label: "Supplier opportunities" }
];

export default async function SellerCentre() {
  const user = await getCurrentAppwriteUser(); if (!user) redirect("/login?returnTo=/seller");
  const vendor = await findVendorByOwner(user.$id); if (!vendor) redirect("/vendor/register");
  const { business, store } = await getVendorBundle(vendor.$id), active = ["approved", "active"].includes(String(vendor.status));
  return <main className="seller-shell"><nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><div><Link href="/account">Account</Link><form action="/api/auth/logout" method="post"><button>Sign out</button></form></div></nav><header><div><p className="kicker">PAC-SM SELLER CENTRE</p><h1>{String(store?.name ?? business.legalName)}</h1><p>{active ? `Merchant ${String(vendor.merchantId)}` : "Your Seller Centre is in compliance mode until approval."}</p></div><span className={`seller-status ${active ? "active" : "pending"}`}>{String(vendor.status).replaceAll("_", " ")}</span></header><section className="seller-grid"><article className="seller-overview"><span>APPLICATION</span><strong>{active ? "Selling enabled" : "Compliance review in progress"}</strong><p>{active ? "Your storefront and operating modules are active." : "Monitor your status here. PAC-SM will request additional information when needed."}</p></article>{active && activeModules.map(module => <article key={module.name}><span>{module.name}</span><strong><Link href={module.href}>{module.label} →</Link></strong></article>)}{plannedModules.map(name => <article key={name}><span>{name}</span><strong>{active ? "Planned module" : "Unlocks after approval"}</strong></article>)}</section></main>;
}
