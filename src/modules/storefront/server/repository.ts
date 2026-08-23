import "server-only";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAppwriteAdminClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const validColour = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export async function getOwnedStore(ownerUserId: string) {
  const result = await createAppwriteDatabaseClient().databases.listDocuments({ databaseId: databaseId(), collectionId: "stores", queries: [Query.equal("ownerUserId", ownerUserId), Query.limit(1)] });
  return result.documents[0] ?? null;
}

export async function updateStoreBranding(input: { ownerUserId: string; primary: string; accent: string; altText: string; logo?: File }) {
  if (!validColour(input.primary) || !validColour(input.accent) || input.altText.trim().length < 3) throw new Error("Invalid storefront branding");
  const store = await getOwnedStore(input.ownerUserId);
  if (!store) throw new Error("Store not found");
  const databases = createAppwriteDatabaseClient().databases;
  let newFileId: string | undefined;
  if (input.logo && input.logo.size > 0) {
    if (input.logo.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(input.logo.type)) throw new Error("Invalid logo file");
    const bytes = Buffer.from(await input.logo.arrayBuffer());
    const signatures = input.logo.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : input.logo.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!signatures) throw new Error("Logo content does not match its file type");
    newFileId = ID.unique();
    await createAppwriteAdminClient("storage").storage.createFile({ bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, fileId: newFileId, file: InputFile.fromBuffer(bytes, input.logo.name), permissions: [] });
  }
  try {
    await databases.updateDocument({ databaseId: databaseId(), collectionId: "stores", documentId: store.$id, data: { themePrimary: input.primary.toUpperCase(), themeAccent: input.accent.toUpperCase(), logoAltText: input.altText.trim(), ...(newFileId ? { logoFileId: newFileId } : {}), brandingUpdatedAt: new Date().toISOString() } });
    await databases.createDocument({ databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId: input.ownerUserId, action: "store.branding_update", entityType: "store", entityId: store.$id, metadata: JSON.stringify({ primary: input.primary, accent: input.accent, logoChanged: Boolean(newFileId) }), occurredAt: new Date().toISOString() } });
  } catch (error) {
    if (newFileId) await createAppwriteAdminClient("storage").storage.deleteFile({ bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, fileId: newFileId }).catch(() => undefined);
    throw error;
  }
}
