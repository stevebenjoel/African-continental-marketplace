import { createAppwriteAdminClient } from "@/src/integrations/appwrite/server";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { env } from "@/src/shared/config/env";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params, { databases, storage } = createAppwriteAdminClient("storage"), config = env();
  try {
    const media = await databases.getDocument({ databaseId: config.APPWRITE_DATABASE_ID, collectionId: "product_media", documentId: mediaId });
    if (media.status !== "approved") {
      const user = await getCurrentAppwriteUser();
      if (!user) return new Response("Not found", { status: 404 });
      const vendor = await findVendorByOwner(user.$id);
      if (!isSuperAdmin(user.labels) && vendor?.$id !== media.vendorId) return new Response("Not found", { status: 404 });
    }
    const bytes = await storage.getFileDownload({ bucketId: String(media.bucketId), fileId: String(media.fileId) });
    return new Response(bytes, { headers: { "Content-Type": String(media.mimeType), "Content-Disposition": `inline; filename="${String(media.filename).replaceAll('"', '')}"`, "Cache-Control": media.status === "approved" ? "public, max-age=3600, stale-while-revalidate=86400" : "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
