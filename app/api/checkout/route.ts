import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { checkout } from "@/src/modules/checkout/server/checkout";
import { isPaymentProvider, startPayment } from "@/src/modules/payments/server/providers";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData(), provider = String(form.get("provider") ?? "demo");
  if (!isPaymentProvider(provider)) return new Response("Invalid payment method", { status: 400 });
  let orderId: string;
  try { orderId = await checkout(user.$id, String(form.get("addressId")), String(form.get("couponCode") ?? "")); }
  catch (error) { console.error("Checkout failed", error); return Response.redirect(new URL("/cart?checkoutError=1", request.url), 303); }
  try { const destination = await startPayment({ userId: user.$id, email: user.email, orderId, provider, origin: new URL(request.url).origin }); return Response.redirect(destination, 303); }
  catch (error) { console.error("Checkout payment start failed", error); return Response.redirect(new URL(`/orders/${orderId}?created=1&paymentError=${encodeURIComponent(provider)}`, request.url), 303); }
}
