import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { addTradeCertification } from "@/src/modules/trade/server/repository";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser(); if (!user) return new Response("Unauthorized", { status: 401 });
  const vendor = await findVendorByOwner(user.$id); if (!vendor) return new Response("Vendor required", { status: 403 });
  const form = await request.formData();
  try { await addTradeCertification({ vendorId: vendor.$id, ownerUserId: user.$id, certificationType: value(form, "certificationType"), certificateNumber: value(form, "certificateNumber"), issuingAuthority: value(form, "issuingAuthority"), countryCode: value(form, "countryCode"), issuedAt: new Date(value(form, "issuedAt")).toISOString(), ...(value(form, "expiresAt") ? { expiresAt: new Date(value(form, "expiresAt")).toISOString() } : {}) }); return Response.redirect(new URL("/seller/trade?certification=1", request.url), 303); }
  catch (error) { console.error("Trade certification failed", error); return Response.redirect(new URL("/seller/trade?error=certification", request.url), 303); }
}
