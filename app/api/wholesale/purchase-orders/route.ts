import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { createListedWholesaleCheckout } from "@/src/modules/wholesale/server/checkout-cart";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/wholesale"), 303);
  const form = await request.formData();
  const offerId = String(form.get("offerId"));
  try {
    await createListedWholesaleCheckout(user.$id, offerId, Number(form.get("quantity")));
    return Response.redirect(publicAppUrl("/checkout?wholesale=listed"), 303);
  } catch (error) {
    console.error("Listed wholesale checkout failed", error);
    return Response.redirect(publicAppUrl(`/wholesale/${encodeURIComponent(offerId)}?orderError=1`), 303);
  }
}
