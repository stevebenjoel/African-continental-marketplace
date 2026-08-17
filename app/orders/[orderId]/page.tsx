import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Query } from "node-appwrite";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export const dynamic = "force-dynamic";
const money = (value: number, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value / 100);

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ created?: string; paid?: string; paymentError?: string; returnRequested?: string; returnError?: string }> }) {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login");
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const databases = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID;
  const paystackAvailable = Boolean(env().PAYSTACK_SECRET_KEY);
  let order;
  try { order = await databases.getDocument({ databaseId, collectionId: "orders", documentId: orderId }); } catch { notFound(); }
  if (String(order.customerUserId) !== user.$id) notFound();
  const [children, shipments, events, returns] = await Promise.all([
    databases.listDocuments({ databaseId, collectionId: "vendor_orders", queries: [Query.equal("orderId", orderId), Query.limit(100)] }),
    databases.listDocuments({ databaseId, collectionId: "shipments", queries: [Query.equal("orderId", orderId), Query.limit(100)] }),
    databases.listDocuments({ databaseId, collectionId: "order_events", queries: [Query.equal("orderId", orderId), Query.orderDesc("occurredAt"), Query.limit(100)] }),
    databases.listDocuments({ databaseId, collectionId: "return_requests", queries: [Query.equal("orderId", orderId), Query.limit(100)] })
  ]);
  return <main className="marketplace-shell">
    <nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/orders">All orders</Link></nav>
    <header><p className="kicker">ORDER DETAILS</p><h1>{String(order.orderNumber)}</h1><p>{String(order.status).replaceAll("_", " ")} · {money(Number(order.totalMinor), String(order.currency))}</p>{query.created && <p className="success-note">Your order is reserved and awaiting payment.</p>}{query.paid && <p className="success-note">Payment captured. Your sellers can now fulfil the order.</p>}{query.paymentError && <p className="form-error">Payment could not be completed with {query.paymentError}. No stock was sold; choose another method or try again.</p>}{query.returnRequested && <p className="success-note">Your return request has been submitted.</p>}{query.returnError && <p className="form-error">The return request could not be submitted. Check eligibility and provide a detailed reason.</p>}</header>
    {String(order.status) === "pending_payment" && <section className="cart-vendor"><h2>Complete payment</h2><p>Choose a payment rail. Demo is active now; live rails activate only after their server credentials and callbacks are configured.</p><form className="stack-form" action="/api/payments/start" method="post"><input type="hidden" name="orderId" value={orderId}/><label><input type="radio" name="provider" value="demo" defaultChecked/> Demo payment (instant test capture)</label><label><input type="radio" name="provider" value="paystack" disabled={!paystackAvailable}/> Paystack (card, bank, USSD or mobile money){!paystackAvailable && " — awaiting server key"}</label><label><input type="radio" name="provider" value="papss" disabled/> PAPSS (continental settlement) — awaiting certified onboarding</label><button type="submit">Continue securely</button></form><small>The order amount is verified on the server before stock is released.</small></section>}
    {children.documents.map(vendorOrder => { const shipment = shipments.documents.find(item => item.vendorOrderId === vendorOrder.$id), returnRequest = returns.documents.find(item => item.vendorOrderId === vendorOrder.$id); return <article className="cart-vendor" key={vendorOrder.$id}><h2>{String(vendorOrder.vendorOrderNumber)}</h2><p>Status: {String(vendorOrder.status).replaceAll("_", " ")}</p>{shipment && <p>Shipment: {String(shipment.carrier)} · {String(shipment.trackingNumber)} · {String(shipment.status).replaceAll("_", " ")} {shipment.trackingUrl && <a href={String(shipment.trackingUrl)} target="_blank" rel="noreferrer">Track →</a>}</p>}{returnRequest ? <p>Return: {String(returnRequest.status).replaceAll("_", " ")}</p> : String(vendorOrder.status) === "delivered" && <form className="stack-form" action={`/api/orders/${orderId}/returns`} method="post"><input type="hidden" name="vendorOrderId" value={vendorOrder.$id}/><label>Return reason<textarea name="reason" required minLength={10} maxLength={1000}/></label><button type="submit">Request return</button></form>}</article>; })}
    <section className="cart-vendor"><h2>Order timeline</h2>{events.documents.length ? events.documents.map(event => <p key={event.$id}>{new Date(String(event.occurredAt)).toLocaleString("en-GB")} · {String(event.eventType).replaceAll("_", " ")}</p>) : <p>No activity recorded.</p>}</section>
  </main>;
}
