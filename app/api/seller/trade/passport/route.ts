import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { submitTradePassport } from "@/src/modules/trade/server/repository";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor || !["approved", "active"].includes(String(vendor.status))) return new Response("Approved vendor required", { status: 403 });
  const form = await request.formData();
  try {
    await submitTradePassport({ vendorId: vendor.$id, ownerUserId: user.$id, exporterNumber: value(form, "exporterNumber"), targetCountries: value(form, "targetCountries"), productCategories: value(form, "productCategories"), incoterms: value(form, "incoterms"), transportModes: value(form, "transportModes") });
    return Response.redirect(publicAppUrl("/seller/trade?submitted=1"), 303);
  } catch (error) { console.error("Trade passport submission failed", error); return Response.redirect(publicAppUrl("/seller/trade?error=passport"), 303); }
}
