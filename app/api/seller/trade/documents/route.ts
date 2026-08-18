import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAppwriteAdminClient } from "@/src/integrations/appwrite/server";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { addTradeDocument } from "@/src/modules/trade/server/repository";
import { env } from "@/src/shared/config/env";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser(); if (!user) return new Response("Unauthorized", { status: 401 });
  const vendor = await findVendorByOwner(user.$id); if (!vendor) return new Response("Vendor required", { status: 403 });
  const form = await request.formData(), file = form.get("document");
  if (!(file instanceof File) || file.size < 1 || file.size > 20 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return Response.redirect(publicAppUrl("/seller/trade?error=document"), 303);
  try { const fileId = ID.unique(), bucketId = env().APPWRITE_KYC_BUCKET_ID; await createAppwriteAdminClient("storage").storage.createFile({ bucketId, fileId, file: InputFile.fromBuffer(Buffer.from(await file.arrayBuffer()), file.name), permissions: [] }); await addTradeDocument({ vendorId: vendor.$id, ownerUserId: user.$id, documentType: String(form.get("documentType") ?? "supporting_document"), referenceNumber: String(form.get("referenceNumber") ?? ""), bucketId, fileId, filename: file.name, mimeType: file.type, sizeBytes: file.size, status: "submitted", uploadedAt: new Date().toISOString() }); return Response.redirect(publicAppUrl("/seller/trade?document=1"), 303); }
  catch (error) { console.error("Trade document upload failed", error); return Response.redirect(publicAppUrl("/seller/trade?error=document"), 303); }
}
