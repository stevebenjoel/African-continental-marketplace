import { createAppwriteAdminClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export async function GET(_: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    const { storeId } = await params;
    const store = await createAppwriteDatabaseClient().databases.getDocument({ databaseId: env().APPWRITE_DATABASE_ID, collectionId: "stores", documentId: storeId });
    if (store.status !== "active" || !store.logoFileId) return new Response("Not found", { status: 404 });
    const storage = createAppwriteAdminClient("storage").storage, fileId = String(store.logoFileId);
    const [file, metadata] = await Promise.all([storage.getFileDownload({ bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, fileId }), storage.getFile({ bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, fileId })]);
    return new Response(file, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "Content-Type": metadata.mimeType, "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
