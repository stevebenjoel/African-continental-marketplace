import Link from "next/link";
import { requireSuperAdmin } from "@/src/modules/authorization/server/require-super-admin";
import { ADMIN_ROLES } from "@/src/modules/authorization/domain/admin-roles";
import { listAdminMembers } from "@/src/modules/authorization/server/admin-team";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  offtaker_verification: "Off-taker Verification Manager",
  seller_onboarding_manager: "Seller Onboarding Manager",
  order_fulfilment_manager: "Order Fulfilment Manager",
  warehouse_manager: "Warehouse Manager",
  warehouse_receiving: "Warehouse Receiving Officer",
  warehouse_picker: "Warehouse Picker",
  warehouse_packer: "Warehouse Packing Officer",
  finance_officer: "Finance Officer",
  support_officer: "Customer Support Officer",
  category_manager: "Category Manager",
  vendor_verification: "Vendor Verification Officer",
  trade_compliance: "Trade Compliance Officer",
  logistics_manager: "Logistics Manager",
  logistics_dispatcher: "Logistics Dispatcher"
};

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ assigned?: string; revoked?: string; error?: string }> }) {
  await requireSuperAdmin();
  const [members, query] = await Promise.all([listAdminMembers(), searchParams]);
  const activeCount=members.documents.filter(member=>member.status==="active").length;
  return <main className="admin-detail"><header><div><p className="kicker">ACCESS CONTROL</p><h1>Administrative team and privileges</h1><p>Grant several operational privileges to one registered PAC-SM email in a single action.</p>{query.assigned && <p className="success-note">{query.assigned} privilege{query.assigned === "1" ? "" : "s"} assigned.</p>}{query.revoked && <p className="success-note">Privilege revoked.</p>}{query.error === "roles" && <p className="form-error">Select at least one administrative privilege.</p>}{query.error === "account" && <p className="form-error">The role change failed. Confirm the email belongs to a registered, non-Super-Admin user.</p>}</div><Link href="/admin">Admin overview</Link></header><section className="admin-role-summary"><article><span>AVAILABLE PRIVILEGES</span><strong>{ADMIN_ROLES.length}</strong></article><article><span>ACTIVE ASSIGNMENTS</span><strong>{activeCount}</strong></article><article><span>CONTROL MODEL</span><strong>Multiple per account</strong></article></section><section className="catalogue-create admin-role-create"><h2>Assign multiple privileges</h2><p>Enter one registered email, then select every responsibility this administrator should hold.</p><form action="/api/admin/team" method="post"><label className="admin-role-email">User email<input name="email" type="email" autoComplete="email" required /></label><fieldset><legend>Administrative privileges</legend><div className="admin-role-options">{ADMIN_ROLES.map(role => <label key={role}><input type="checkbox" name="roles" value={role}/><span><strong>{labels[role]}</strong><small>{role.replaceAll("_", " ")}</small></span></label>)}</div></fieldset><button>Grant selected privileges</button></form><p>Privileges are cumulative and can be revoked individually below. Super Administrator access cannot be granted or revoked from this screen.</p></section><section className="review-table"><div className="review-row review-head"><span>Email</span><span>Privilege</span><span>Status</span><span>Action</span></div>{members.documents.map(member => <div className="review-row" key={member.$id}><span>{String(member.email)}</span><strong>{labels[String(member.role)] ?? String(member.role)}</strong><span>{String(member.status)}</span>{member.status === "active" ? <form action={`/api/admin/team/${member.$id}/revoke`} method="post"><button>Revoke this privilege</button></form> : <span>{member.revokedAt ? new Date(String(member.revokedAt)).toLocaleDateString("en-GB") : "—"}</span>}</div>)}</section></main>;
}
