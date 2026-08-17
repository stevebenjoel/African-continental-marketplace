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
  return <main className="admin-detail"><header><div><p className="kicker">ACCESS CONTROL</p><h1>Administrative team and privileges</h1><p>Users must register a PAC-SM account before a role can be assigned.</p>{query.assigned && <p className="success-note">Privilege assigned.</p>}{query.revoked && <p className="success-note">Privilege revoked.</p>}{query.error && <p className="form-error">The role change failed. Confirm the email belongs to a registered user.</p>}</div><Link href="/admin">Admin overview</Link></header><section className="catalogue-create"><h2>Assign a privilege</h2><form action="/api/admin/team" method="post"><label>User email<input name="email" type="email" required /></label><label>Administrative level<select name="role">{ADMIN_ROLES.map(role => <option value={role} key={role}>{labels[role]}</option>)}</select></label><button>Grant privilege</button></form><p>Super Administrator cannot be granted or revoked from this screen.</p></section><section className="review-table"><div className="review-row review-head"><span>Email</span><span>Role</span><span>Status</span><span>Action</span></div>{members.documents.map(member => <div className="review-row" key={member.$id}><span>{String(member.email)}</span><strong>{labels[String(member.role)] ?? String(member.role)}</strong><span>{String(member.status)}</span>{member.status === "active" ? <form action={`/api/admin/team/${member.$id}/revoke`} method="post"><button>Revoke</button></form> : <span>{member.revokedAt ? new Date(String(member.revokedAt)).toLocaleDateString("en-GB") : "—"}</span>}</div>)}</section></main>;
}
