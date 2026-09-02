import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { buildBulkProductTemplate } from "@/src/modules/catalogue/domain/bulk-products";

export async function GET() {
  const user = await getCurrentAppwriteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const vendor = await findVendorByOwner(user.$id);
  if (!vendor || !["approved", "active"].includes(String(vendor.status))) return new Response("Approved seller required", { status: 403 });
  return new Response(buildBulkProductTemplate(), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pac-sm-product-bulk-upload-template.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
