import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { updateStoreBranding } from "@/src/modules/storefront/server/repository";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser(); if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/seller/storefront"), 303);
  try { const form = await request.formData(), logo = form.get("logo"); await updateStoreBranding({ ownerUserId: user.$id, primary: String(form.get("primary") ?? ""), accent: String(form.get("accent") ?? ""), altText: String(form.get("altText") ?? ""), ...(logo instanceof File && logo.size ? { logo } : {}) }); return Response.redirect(publicAppUrl("/seller/storefront?saved=1"), 303); }
  catch (error) { console.error("Storefront branding update failed", error); return Response.redirect(publicAppUrl("/seller/storefront?error=1"), 303); }
}
