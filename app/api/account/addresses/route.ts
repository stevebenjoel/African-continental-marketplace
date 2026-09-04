import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl, safeReturnTo } from "@/src/modules/auth/server/request-security";
import { createAddress } from "@/src/modules/customers/server/repository";
import { normalizePhoneToE164 } from "@/src/modules/localization/domain/phone";
import { validCountry } from "@/src/modules/localization/domain/regions";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const required = ["label", "recipientName", "phone", "phoneCountryCode", "line1", "city", "region", "countryCode"];
  if (required.some(key => !text(form, key))) return new Response("Invalid address", { status: 400 });
  const countryCode = text(form, "countryCode").toUpperCase();
  if (!validCountry(countryCode)) return new Response("Invalid country", { status: 400 });
  let phone: string;
  try { phone = normalizePhoneToE164(text(form, "phone"), text(form, "phoneCountryCode")); } catch { return new Response("Invalid phone number", { status: 400 }); }
  await createAddress({ userId: user.$id, label: text(form, "label"), recipientName: text(form, "recipientName"), phone, line1: text(form, "line1"), line2: text(form, "line2"), city: text(form, "city"), region: text(form, "region"), postalCode: text(form, "postalCode"), countryCode });
  const requestedReturn = form.get("returnTo");
  const destination = requestedReturn ? safeReturnTo(requestedReturn) : "/account/addresses?saved=1";
  return Response.redirect(publicAppUrl(destination), 303);
}
