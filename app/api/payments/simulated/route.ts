import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { captureSimulatedPayment } from "@/src/modules/payments/server/simulated-payment";
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const orderId = String(form.get("orderId") ?? "");
  if (!orderId) return new Response("Order ID is required", { status: 400 });
  try { await captureSimulatedPayment(user.$id, orderId); return Response.redirect(publicAppUrl(`/orders/${orderId}?paid=1`), 303); }
  catch (error) { console.error("Simulated payment failed", error); return Response.redirect(publicAppUrl(`/orders/${orderId}?paymentError=1`), 303); }
}
