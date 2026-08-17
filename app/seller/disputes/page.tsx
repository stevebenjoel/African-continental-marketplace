import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { listVendorDisputes } from "@/src/modules/disputes/server/repository";
export const dynamic = "force-dynamic";
export default async function SellerDisputesPage() { const user = await getCurrentAppwriteUser(); if (!user) redirect("/login?returnTo=/seller/disputes"); const vendor = await findVendorByOwner(user.$id); if (!vendor) redirect("/vendor/register"); const disputes = await listVendorDisputes(vendor.$id); return <main className="seller-shell"><nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/seller">Seller Centre</Link></nav><header><div><p className="kicker">SELLER SUPPORT</p><h1>Customer disputes</h1><p>Read-only visibility while platform administrators investigate.</p></div></header><section className="review-table">{disputes.documents.length ? disputes.documents.map(item => <div className="review-row" key={item.$id}><span>{String(item.disputeNumber)}</span><strong>{String(item.status)}</strong><span>{String(item.category).replaceAll("_", " ")}</span><span>{String(item.resolution ?? "Under platform review")}</span></div>) : <p className="empty-state">Your store has no disputes.</p>}</section></main>; }
