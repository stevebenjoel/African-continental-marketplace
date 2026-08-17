import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { transitionVendorOrder } from "@/src/modules/orders/server/fulfilment";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";

export async function POST(request: Request, { params }: { params: Promise<{ vendorOrderId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor || !["approved", "active"].includes(String(vendor.status))) return new Response("Forbidden", { status: 403 });
  const [{ vendorOrderId }, form] = await Promise.all([params, request.formData()]);
  try {
    await transitionVendorOrder({ vendorId: vendor.$id, vendorOrderId, actorUserId: user.$id, nextStatus: String(form.get("status") ?? ""), carrier: String(form.get("carrier") ?? ""), trackingNumber: String(form.get("trackingNumber") ?? ""), trackingUrl: String(form.get("trackingUrl") ?? "") });
    return Response.redirect(new URL(`/seller/orders/${vendorOrderId}?updated=1`, request.url), 303);
  } catch (error) { console.error("Order transition failed", error); return Response.redirect(new URL(`/seller/orders/${vendorOrderId}?error=1`, request.url), 303); }
}
