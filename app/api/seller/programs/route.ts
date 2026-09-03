import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { findVendorByOwner, getVendorBundle } from "@/src/modules/vendors/server/repository";
import { saveProductProgram } from "@/src/modules/catalogue/server/product-programs";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optionalNumber = (form: FormData, key: string) => text(form, key) ? Number(text(form, key)) : undefined;
const optionalDate = (form: FormData, key: string) => text(form, key) ? new Date(text(form, key)).toISOString() : undefined;

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser(); if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/seller/programs"), 303);
  const vendor = await findVendorByOwner(user.$id); if (!vendor || !["approved", "active"].includes(String(vendor.status))) return new Response("Approved seller required", { status: 403 });
  const { compliance } = await getVendorBundle(vendor.$id); if (String(compliance?.vendorType) !== "manufacturer") return new Response("Verified manufacturer required", { status: 403 });
  try { const form = await request.formData(); await saveProductProgram({ offerId: text(form, "offerId"), vendorId: vendor.$id, actorUserId: user.$id, preorderEnabled: form.has("preorderEnabled"), preorderOpensAt: optionalDate(form, "preorderOpensAt"), preorderClosesAt: optionalDate(form, "preorderClosesAt"), estimatedDispatchAt: optionalDate(form, "estimatedDispatchAt"), preorderCapacity: optionalNumber(form, "preorderCapacity"), whiteLabelEnabled: form.has("whiteLabelEnabled"), whiteLabelMinimumQuantity: optionalNumber(form, "whiteLabelMinimumQuantity"), whiteLabelLeadDays: optionalNumber(form, "whiteLabelLeadDays"), whiteLabelOptions: text(form, "whiteLabelOptions") }); return Response.redirect(publicAppUrl("/seller/programs?updated=1"), 303); } catch (error) { console.error("Product programme update failed", error); return Response.redirect(publicAppUrl("/seller/programs?error=1"), 303); }
}
