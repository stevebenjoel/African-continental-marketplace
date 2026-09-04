import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAppwriteAdminClient } from "@/src/integrations/appwrite/server";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { addCarrierDocument, createCarrierApplication, findCarrierApplicationByOwner } from "@/src/modules/logistics/server/repository";
import { normalizePhoneToE164 } from "@/src/modules/localization/domain/phone";
import { validCountry } from "@/src/modules/localization/domain/regions";
import { env } from "@/src/shared/config/env";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/carriers/apply"), 303);
  if (await findCarrierApplicationByOwner(user.$id)) return Response.redirect(publicAppUrl("/carriers/apply?existing=1"), 303);
  const form = await request.formData();
  const files = ["registrationDocument", "insuranceDocument"].map(documentType => ({ documentType, file: form.get(documentType) }));
  if (files.some(item => !(item.file instanceof File) || item.file.size < 1 || item.file.size > 20 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(item.file.type))) return Response.redirect(publicAppUrl("/carriers/apply?error=document"), 303);
  try {
    const countryCode = value(form, "countryCode").toUpperCase();
    if (!validCountry(countryCode)) throw new Error("INVALID_COUNTRY");
    const application = await createCarrierApplication({ ownerUserId: user.$id, legalName: value(form, "legalName"), tradingName: value(form, "tradingName"), registrationNumber: value(form, "registrationNumber"), taxId: value(form, "taxId"), countryCode, contactEmail: user.email, contactPhone: normalizePhoneToE164(value(form, "contactPhone"), value(form, "phoneCountryCode")), transportModes: form.getAll("transportModes").map(String).join(", "), serviceCountries: value(form, "serviceCountries").split(/[,\s]+/).filter(Boolean), fleetDescription: value(form, "fleetDescription"), insurancePolicyNumber: value(form, "insurancePolicyNumber") });
    const storage = createAppwriteAdminClient("storage").storage, bucketId = env().APPWRITE_KYC_BUCKET_ID;
    for (const item of files as { documentType: string; file: File }[]) {
      const fileId = ID.unique();
      await storage.createFile({ bucketId, fileId, file: InputFile.fromBuffer(Buffer.from(await item.file.arrayBuffer()), item.file.name), permissions: [] });
      await addCarrierDocument({ applicationId: application.$id, ownerUserId: user.$id, documentType: item.documentType, bucketId, fileId, filename: item.file.name, mimeType: item.file.type, sizeBytes: item.file.size, status: "submitted", uploadedAt: new Date().toISOString() });
    }
    return Response.redirect(publicAppUrl("/carriers/apply?submitted=1"), 303);
  } catch (error) { console.error("Carrier application failed", error); return Response.redirect(publicAppUrl("/carriers/apply?error=application"), 303); }
}
