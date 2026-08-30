import Link from "next/link";
import { requireSuperAdmin } from "@/src/modules/authorization/server/require-super-admin";

export const dynamic = "force-dynamic";

const modules = [
  { name: "Product Management", value: "Manage marketplace products", note: "Review live seller listings, approve legacy products, take down, restore or delete", href: "/admin/catalogue" },
  { name: "Customer Support", value: "Live chat & WhatsApp", note: "Manage the separate WhatsApp contact channels shown beside the AI assistant", href: "/admin/support" },
  { name: "Daily Reconciliation", value: "Operations and account control", note: "Orders, payments, fulfilment, transit, complaints and exceptions", href: "/admin/reconciliation" },
  { name: "Trade Academy", value: "Learning operations", note: "Curriculum, enrolments, progress, assessments, projects and credentials", href: "/admin/academy" },
  { name: "Off-takers", value: "Corporate buyer ecosystem", note: "KYB, requirements, agreements and inspections", href: "/admin/offtakers" },
  { name: "Off-taker Finance", value: "Milestones & disputes", note: "Settlement status and dispute resolution", href: "/admin/offtakers/finance" },
  { name: "User & Seller Accounts", value: "Unified account directory", note: "Authentication users, sellers, stores and admin roles", href: "/admin/accounts" },
  { name: "Seller Onboarding", value: "Assisted account creation", note: "Create active seller accounts and stores", href: "/onboarding/sellers" },
  { name: "Orders & Delivery", value: "Payment-to-delivery control", note: "See payments, purchased products, addresses and fulfilment", href: "/admin/orders" },
  { name: "Wholesale Negotiations", value: "Open negotiation queue", note: "Accept, reject or counter PAC-SM and demo-product price requests", href: "/admin/wholesale-negotiations" },
  { name: "Vendors", value: "Review centre active", note: "Verification and activation queue", href: "/admin/vendors" },
  { name: "Returns", value: "Review centre active", note: "Buyer protection and refund decisions", href: "/admin/returns" },
  { name: "Finance", value: "Ledger & revenue controls", note: "Versioned commission rules, journals, refunds and settlements", href: "/admin/finance" }
  ,{ name: "Commission Rules", value: "PAC-SM and vendor percentages", note: "Create, preview, schedule and audit channel or seller-specific revenue rules", href: "/admin/finance/commissions" }
  ,{ name: "Seller Withdrawals", value: "Review claims", note: "Approve or reject wallet claims through the central account", href: "/admin/withdrawals" }
  ,{ name: "Disputes", value: "Resolution centre active", note: "Customer protection cases", href: "/admin/disputes" }
  ,{ name: "Analytics", value: "Live dashboards", note: "Marketplace operating metrics", href: "/admin/analytics" }
  ,{ name: "Coupons", value: "Promotion controls", note: "Discount campaigns and usage", href: "/admin/coupons" }
  ,{ name: "Business Buyers", value: "Wholesale approvals", note: "Institutional and bulk buyer compliance", href: "/admin/business-buyers" }
  ,{ name: "RFQ Procurement", value: "Trade sourcing active", note: "Supplier matching and quotations", href: "/admin/rfqs" }
  ,{ name: "Warehousing", value: "Fulfilment centre active", note: "Inbound, put-away, picking and packing", href: "/admin/warehousing" }
  ,{ name: "Logistics", value: "Carrier marketplace active", note: "Carrier verification, rates, dispatch and tracking", href: "/admin/logistics" }
  ,{ name: "Continental Trade", value: "Trade compliance active", note: "Passports, export readiness and customs records", href: "/admin/trade" }
  ,{ name: "Regulatory Control", value: "Versioned market-access rules", note: "Official sources, HS oversight and destination readiness", href: "/admin/trade-compliance" }
  ,{ name: "HS Classification Review", value: "Govern AI and vendor suggestions", note: "Review confidence, reasoning and clarification questions", href: "/admin/trade-compliance/classifications" }
  ,{ name: "Standards", value: "Compliance registry active", note: "Product, packaging, certification and quality centres", href: "/admin/standards" }
  ,{ name: "Enterprise APIs", value: "Merchant API v1 active", note: "Scoped credentials, webhooks and connectors", href: "/developers" }
  ,{ name: "Intelligence", value: "Forecasting and risk active", note: "Demand models, recommendations, jobs and fraud signals", href: "/admin/intelligence" }
  ,{ name: "Admin Team", value: "Privilege management", note: "Assign operational roles by registered email", href: "/admin/team" }
];

export default async function AdminPage() {
  const user = await requireSuperAdmin();
  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="brand" href="/"><span>PAC</span><b>SM</b></Link>
      <div><p>ADMIN CENTRE</p><nav aria-label="Admin navigation"><a className="active" href="#overview">Overview</a><Link className="admin-priority-link" href="/admin/accounts">User & Seller Accounts</Link><Link href="/admin/team">Admin Team & Privileges</Link><Link href="/admin/wholesale-negotiations">Wholesale Negotiations</Link><a href="#operations">All operations</a><a href="#platform">Platform</a></nav></div>
      <form action="/api/auth/logout" method="post"><button>Sign out</button></form>
    </aside>
    <section className="admin-main" id="overview">
      <header><div><p className="kicker">SUPER ADMINISTRATION</p><h1>Continental command centre.</h1></div><div className="admin-identity"><span>Signed in as</span><strong>{user.email}</strong></div></header>
      <div className="admin-notice"><strong>Appwrite operations active</strong><p>Authentication, marketplace data, private files, review history and audit records are connected to the self-hosted backend.</p></div>
      <section className="admin-primary-actions"><Link href="/admin/accounts"><span>IDENTITY & ACCESS</span><strong>User & Seller Accounts</strong><p>Find every registered member, review sellers and administrators, suspend access, revoke sessions or delete eligible customer accounts.</p><b>Manage accounts →</b></Link><Link href="/admin/wholesale-negotiations"><span>WHOLESALE PRICE REQUESTS</span><strong>Review buyer negotiations</strong><p>Accept, reject or send a counteroffer for PAC-SM-owned and demo products.</p><b>Open queue →</b></Link></section>
      <section className="admin-grid" id="operations">{modules.map((module) => <article className={["/admin/catalogue","/admin/accounts"].includes(module.href??"") ? "admin-operation-priority" : undefined} key={module.name}><span>{module.name}</span><strong>{module.href ? <Link href={module.href}>{module.value}</Link> : module.value}</strong><p>{module.note}</p></article>)}</section>
      <section className="admin-platform" id="platform"><div><p className="kicker">PLATFORM STATUS</p><h2>Core services</h2></div><div className="service-list"><p><span className="status-dot online" />Appwrite authentication</p><p><span className="status-dot online" />Appwrite secure storage</p><p><span className="status-dot online" />Appwrite database</p><p><span className="status-dot waiting" />Marketplace worker</p></div></section>
    </section>
  </main>;
}
