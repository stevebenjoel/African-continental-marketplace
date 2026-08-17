import Link from "next/link";
import { requireTradeStaff } from "@/src/modules/authorization/server/require-trade-staff";
import { listTradePassports } from "@/src/modules/trade/server/repository";

export const dynamic = "force-dynamic";
export default async function AdminTradePage() {
  await requireTradeStaff(); const passports = await listTradePassports();
  const approved = passports.documents.filter(item => item.status === "approved").length;
  return <main className="admin-detail"><header><div><p className="kicker">PHASE 8 · TRADE INFRASTRUCTURE</p><h1>Continental trade compliance</h1><p>Review Digital Trade Passports, export readiness, certification and customs information.</p></div><Link href="/admin">Admin overview</Link></header><section className="seller-grid"><article><span>PASSPORTS</span><strong>{passports.total}</strong></article><article><span>APPROVED</span><strong>{approved}</strong></article><article><span>AWAITING ACTION</span><strong>{passports.documents.filter(item => ["submitted", "information_requested"].includes(String(item.status))).length}</strong></article></section><section className="review-table"><div className="review-row review-head"><span>Passport</span><span>Readiness</span><span>Status</span><span>Review</span></div>{passports.documents.length ? passports.documents.map(passport => <div className="review-row" key={passport.$id}><span>{String(passport.passportNumber)}</span><strong>{String(passport.readinessScore)}%</strong><span>{String(passport.status).replaceAll("_", " ")}</span><Link href={`/admin/trade/${passport.$id}`}>Open dossier →</Link></div>) : <p className="empty-state">No trade passports have been submitted.</p>}</section></main>;
}
