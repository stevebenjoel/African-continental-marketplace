import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { createNegotiation } from "@/src/modules/wholesale/server/negotiations";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/wholesale"), 303);
  const form = await request.formData(), offerId = String(form.get("offerId"));
  try {
    const negotiationId = await createNegotiation({ buyerUserId: user.$id, offerId, quantity: Number(form.get("quantity")), unitPriceMinor: Math.round(Number(form.get("unitPrice")) * 100), deliveryCountryCode: String(form.get("deliveryCountryCode")), requestedDeliveryAt: String(form.get("requestedDeliveryAt") ?? "") || undefined, message: String(form.get("message") ?? "") });
    return Response.redirect(publicAppUrl(`/wholesale/negotiations/${negotiationId}?created=1`), 303);
  } catch (error) {
    console.error("Wholesale negotiation creation failed", error);
    return Response.redirect(publicAppUrl(`/wholesale/${encodeURIComponent(offerId)}?negotiationError=1`), 303);
  }
}
