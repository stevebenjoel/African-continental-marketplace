import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { getVendorOrderBundle } from "@/src/modules/orders/server/repository";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";

export const dynamic = "force-dynamic";
const money = (value: number, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value / 100);

export default async function SellerOrderPage({ params, searchParams }: { params: Promise<{ vendorOrderId: string }>; searchParams: Promise<{ updated?: string; error?: string }> }) {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?returnTo=/seller/orders");
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor) redirect("/vendor/register");
  const [{ vendorOrderId }, query] = await Promise.all([params, searchParams]);
  let bundle; try { bundle = await getVendorOrderBundle(vendor.$id, vendorOrderId); } catch { notFound(); }
  const { vendorOrder, items, shipment, events, returnRequest } = bundle;
  const status = String(vendorOrder.status);
  const next = status === "new" ? "processing" : status === "processing" ? "packed" : status === "dispatched" ? "delivered" : null;
  return <main className="seller-shell"><nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/seller/orders">All seller orders</Link></nav><header><div><p className="kicker">FULFILMENT WORKSPACE</p><h1>{String(vendorOrder.vendorOrderNumber)}</h1><p>{status.replaceAll("_", " ")} · {money(Number(vendorOrder.subtotalMinor), String(vendorOrder.currency))}</p>{query.updated && <p className="success-note">Order status updated.</p>}{query.error && <p className="form-error">The update was rejected. Check the required details and current status.</p>}</div></header><section className="cart-vendor"><h2>Items to fulfil</h2>{items.map(item => <article key={item.$id}><div><strong>{String(item.productName)}</strong><span>SKU {String(item.sellerSku)} · Qty {String(item.quantity)}</span></div><strong>{money(Number(item.lineTotalMinor), String(item.currency))}</strong></article>)}</section>{status === "packed" ? <section className="cart-vendor"><h2>Dispatch shipment</h2><form className="stack-form" action={`/api/seller/orders/${vendorOrderId}/status`} method="post"><input type="hidden" name="status" value="dispatched"/><label>Carrier<input name="carrier" required maxLength={120}/></label><label>Tracking number<input name="trackingNumber" required maxLength={120}/></label><label>Tracking URL (optional)<input name="trackingUrl" type="url" maxLength={1000}/></label><button type="submit">Dispatch order</button></form></section> : next && <section className="cart-vendor"><h2>Next fulfilment step</h2><form action={`/api/seller/orders/${vendorOrderId}/status`} method="post"><input type="hidden" name="status" value={next}/><button type="submit">Mark as {next}</button></form></section>}{shipment && <section className="cart-vendor"><h2>Shipment</h2><p>{String(shipment.carrier)} · {String(shipment.trackingNumber)} · {String(shipment.status).replaceAll("_", " ")}</p>{shipment.trackingUrl && <a href={String(shipment.trackingUrl)} target="_blank" rel="noreferrer">Open carrier tracking →</a>}</section>}{returnRequest && <section className="cart-vendor"><h2>Return request</h2><p>{String(returnRequest.status).replaceAll("_", " ")}: {String(returnRequest.reason)}</p></section>}<section className="cart-vendor"><h2>Activity</h2>{events.length ? events.map(event => <p key={event.$id}>{new Date(String(event.occurredAt)).toLocaleString("en-GB")} · {String(event.eventType).replaceAll("_", " ")}</p>) : <p>No fulfilment events yet.</p>}</section></main>;
}
