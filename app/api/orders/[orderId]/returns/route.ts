import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { requestReturn } from "@/src/modules/orders/server/fulfilment";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [{ orderId }, form] = await Promise.all([params, request.formData()]);
  try { await requestReturn({ userId: user.$id, orderId, vendorOrderId: String(form.get("vendorOrderId") ?? ""), reason: String(form.get("reason") ?? "") }); return Response.redirect(new URL(`/orders/${orderId}?returnRequested=1`, request.url), 303); }
  catch (error) { console.error("Return request failed", error); return Response.redirect(new URL(`/orders/${orderId}?returnError=1`, request.url), 303); }
}
