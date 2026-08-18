import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAppwriteAdminClient } from "@/src/integrations/appwrite/server";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { addVendorDocument, createVendorApplication, findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { env } from "@/src/shared/config/env";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/vendor/register"), 303);
  if (await findVendorByOwner(user.$id)) return Response.redirect(publicAppUrl("/vendor/register"), 303);
  const form = await request.formData();
  const required = ["fullName", "phone", "countryCode", "legalName", "registrationNumber", "businessType", "vendorType", "address", "operationalAddress", "directors", "beneficialOwners", "bankName", "bankAccountName", "bankAccountNumber", "bankCountryCode", "storeName", "storeSlug", "currency"];
  if (required.some((key) => !text(form, key))) return Response.redirect(publicAppUrl("/vendor/register?error=Complete+all+required+fields"), 303);
  const files = ["registration_certificate", "tax_document", "owner_identity"].map((type) => ({ type, file: form.get(type) }));
  if (files.some(({ file }) => !(file instanceof File) || file.size < 1 || file.size > 20 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type))) return Response.redirect(publicAppUrl("/vendor/register?error=Upload+valid+PDF,+JPG+or+PNG+documents+under+20MB"), 303);
  try {
    const splitNames = (value: string) => value.split(/\r?\n|,/).map((name) => name.trim()).filter(Boolean).slice(0, 25);
    const { vendorId } = await createVendorApplication({ userId: user.$id, email: user.email, fullName: text(form, "fullName"), phone: text(form, "phone"), countryCode: text(form, "countryCode").toUpperCase(), legalName: text(form, "legalName"), tradingName: text(form, "tradingName"), registrationNumber: text(form, "registrationNumber"), taxId: text(form, "taxId"), businessType: text(form, "businessType"), vendorType: text(form, "vendorType"), address: text(form, "address"), operationalAddress: text(form, "operationalAddress"), directors: splitNames(text(form, "directors")), beneficialOwners: splitNames(text(form, "beneficialOwners")), bankName: text(form, "bankName"), bankAccountName: text(form, "bankAccountName"), bankAccountNumber: text(form, "bankAccountNumber"), bankCountryCode: text(form, "bankCountryCode").toUpperCase(), swiftCode: text(form, "swiftCode").toUpperCase(), exporterNumber: text(form, "exporterNumber"), storeName: text(form, "storeName"), storeSlug: text(form, "storeSlug").toLowerCase(), currency: text(form, "currency").toUpperCase() });
    const { storage } = createAppwriteAdminClient("storage");
    for (const item of files as { type: string; file: File }[]) {
      const fileId = ID.unique();
      await storage.createFile({ bucketId: env().APPWRITE_KYC_BUCKET_ID, fileId, file: InputFile.fromBuffer(Buffer.from(await item.file.arrayBuffer()), item.file.name), permissions: [] });
      await addVendorDocument({ vendorId, ownerUserId: user.$id, documentType: item.type, bucketId: env().APPWRITE_KYC_BUCKET_ID, fileId, filename: item.file.name, mimeType: item.file.type, sizeBytes: item.file.size, status: "submitted" });
    }
    return Response.redirect(publicAppUrl("/vendor/register?submitted=1"), 303);
  } catch (error) {
    console.error("Vendor application failed", error);
    return Response.redirect(publicAppUrl("/vendor/register?error=Application+could+not+be+submitted"), 303);
  }
}
