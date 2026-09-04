import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAppwriteAdminClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { normalizeProductImageAlt, validateProductImageBatch, validProductImageSignature } from "@/src/modules/catalogue/domain/product-media";
import { createProductMedia, listProductMedia } from "@/src/modules/catalogue/server/media";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { env } from "@/src/shared/config/env";

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.redirect(publicAppUrl("/login?returnTo=/seller/products"), 303);
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor || !["approved", "active"].includes(String(vendor.status))) return new Response("Vendor approval required", { status: 403 });
  const { productId } = await params;
  const databases = createAppwriteDatabaseClient().databases;
  try {
    const product = await databases.getDocument({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "products", documentId: productId });
    if (product.submittedByVendorId !== vendor.$id) return new Response("Not found", { status: 404 });
    const form = await request.formData(), altText = normalizeProductImageAlt(String(form.get("altText") ?? product.name));
    const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
    const existing = await listProductMedia(productId);
    validateProductImageBatch(existing.total, files);
    const validatedImages = await Promise.all(files.map(async file => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validProductImageSignature(bytes, file.type)) throw new Error("Image content does not match its type");
      return { file, bytes };
    }));
    const storage = createAppwriteAdminClient("storage").storage;
    for (const [index, { file, bytes }] of validatedImages.entries()) {
      const fileId = ID.unique();
      await storage.createFile({ bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, fileId, file: InputFile.fromBuffer(Buffer.from(bytes), file.name), permissions: [] });
      try { await createProductMedia({ productId, vendorId: vendor.$id, actorUserId: user.$id, fileId, filename: file.name, mimeType: file.type, sizeBytes: file.size, altText: files.length > 1 ? `${altText} — image ${existing.total + index + 1}` : altText, sortOrder: existing.total + index, makePrimary: existing.total === 0 && index === 0 }); }
      catch (error) { await storage.deleteFile({ bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, fileId }).catch(() => undefined); throw error; }
    }
    return Response.redirect(publicAppUrl("/seller/products?media=published"), 303);
  } catch (error) {
    console.error("Product media upload failed", error);
    return Response.redirect(publicAppUrl("/seller/products?media=error"), 303);
  }
}
