import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { listCategories, submitProductsBulk } from "@/src/modules/catalogue/server/repository";
import { BULK_PRODUCT_MAX_BYTES, parseBulkProductsCsv } from "@/src/modules/catalogue/domain/bulk-products";
import { importRemoteProductImages } from "@/src/modules/catalogue/server/remote-product-media";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ ok: false, errors: [{ row: 0, field: "request", message: "Forbidden request origin" }] }, { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user) return Response.json({ ok: false, errors: [{ row: 0, field: "account", message: "Sign in again before uploading" }] }, { status: 401 });
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor || !["approved", "active"].includes(String(vendor.status))) return Response.json({ ok: false, errors: [{ row: 0, field: "account", message: "Approved seller access is required" }] }, { status: 403 });
  const form = await request.formData(), file = form.get("catalogue");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return Response.json({ ok: false, errors: [{ row: 0, field: "file", message: "Choose a CSV file" }] }, { status: 400 });
  if (file.size < 1 || file.size > BULK_PRODUCT_MAX_BYTES) return Response.json({ ok: false, errors: [{ row: 0, field: "file", message: "CSV must be between 1 byte and 1 MB" }] }, { status: 400 });
  const categories = await listCategories(), validCategoryIds = new Set(categories.documents.map(category => category.$id));
  const result = parseBulkProductsCsv(await file.text(), validCategoryIds);
  if (result.errors.length) return Response.json({ ok: false, errors: result.errors }, { status: 422 });
  try { const productIds = await submitProductsBulk(vendor.$id, user.$id, result.products);let imagesImported=0;const mediaErrors:Array<{row:number;field:string;message:string}>=[];for(const[index,product]of result.products.entries()){if(!product.imageUrls.length)continue;try{imagesImported+=await importRemoteProductImages({urls:product.imageUrls,productId:productIds[index],vendorId:vendor.$id,actorUserId:user.$id,productName:product.name})}catch(error){mediaErrors.push({row:index+2,field:"image_urls",message:error instanceof Error?error.message:"Remote images could not be imported"})}}return Response.json({ ok: true, imported: productIds.length, productIds,imagesImported,mediaErrors }); }
  catch (error) { console.error("Bulk product upload failed", error); return Response.json({ ok: false, errors: [{ row: 0, field: "database", message: "Nothing was imported. Check that every slug and seller SKU is new, then retry." }] }, { status: 409 }); }
}
