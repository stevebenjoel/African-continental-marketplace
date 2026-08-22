import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteAdminClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;

export const listProductMedia = (productId: string, approvedOnly = false) => db().listDocuments({
  databaseId: databaseId(), collectionId: "product_media",
  queries: [Query.equal("productId", productId), ...(approvedOnly ? [Query.equal("status", "approved")] : []), Query.orderAsc("sortOrder"), Query.limit(20)]
});

export const listVendorProductMedia = (vendorId: string) => db().listDocuments({
  databaseId: databaseId(), collectionId: "product_media",
  queries: [Query.equal("vendorId", vendorId), Query.orderDesc("uploadedAt"), Query.limit(500)]
});

export const listModerationMedia = () => db().listDocuments({
  databaseId: databaseId(), collectionId: "product_media",
  queries: [Query.orderDesc("uploadedAt"), Query.limit(500)]
});

export async function listApprovedMediaForProducts(productIds: string[]) {
  if (!productIds.length) return new Map<string, Awaited<ReturnType<typeof listProductMedia>>["documents"]>();
  const result = await db().listDocuments({ databaseId: databaseId(), collectionId: "product_media", queries: [Query.equal("productId", productIds), Query.equal("status", "approved"), Query.limit(5000)] });
  const grouped = new Map<string, typeof result.documents>();
  for (const media of result.documents.sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))) {
    const key = String(media.productId), rows = grouped.get(key) ?? [];
    rows.push(media); grouped.set(key, rows);
  }
  for (const rows of grouped.values()) rows.sort((a, b) => (String(b.isPrimary) === "true" ? 1 : 0) - (String(a.isPrimary) === "true" ? 1 : 0) || Number(a.sortOrder) - Number(b.sortOrder));
  return grouped;
}

export async function createProductMedia(input: { productId: string; vendorId: string; fileId: string; filename: string; mimeType: string; sizeBytes: number; altText: string; sortOrder: number }) {
  return db().createDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: ID.unique(), permissions: [], data: { ...input, bucketId: env().APPWRITE_PRODUCT_MEDIA_BUCKET_ID, isPrimary: "false", status: "submitted", uploadedAt: new Date().toISOString() } });
}

export async function reviewProductMedia(mediaId: string, action: "approve" | "reject" | "set_primary", actorUserId: string, notes: string) {
  const databases = db(), media = await databases.getDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: mediaId }), now = new Date().toISOString();
  if (action === "set_primary" && media.status !== "approved") throw new Error("Only approved media can be primary");
  if (action === "reject" && media.status === "approved") {
    const [product, approved] = await Promise.all([databases.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(media.productId) }), listProductMedia(String(media.productId), true)]);
    if (product.status === "approved" && approved.total <= 1) throw new Error("An approved product must retain one approved image");
  }
  if (action === "set_primary") {
    const siblings = await listProductMedia(String(media.productId), true);
    await Promise.all(siblings.documents.map(item => databases.updateDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: item.$id, data: { isPrimary: item.$id === mediaId ? "true" : "false" } })));
  } else {
    const status = action === "approve" ? "approved" : "rejected";
    await databases.updateDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: mediaId, data: { status, isPrimary: status === "approved" ? String(media.isPrimary) : "false", reviewedAt: now, reviewedBy: actorUserId, reviewNotes: notes.trim() } });
    if (status === "approved") {
      const approved = await listProductMedia(String(media.productId), true);
      if (!approved.documents.some(item => String(item.isPrimary) === "true")) await databases.updateDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: mediaId, data: { isPrimary: "true" } });
    }
  }
  await databases.createDocument({ databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId, action: `product_media.${action}`, entityType: "product_media", entityId: mediaId, metadata: JSON.stringify({ productId: media.productId, notes }), occurredAt: now } });
}

export async function setVendorPrimaryMedia(mediaId: string, vendorId: string, actorUserId: string) {
  const media = await db().getDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: mediaId });
  if (media.vendorId !== vendorId || media.status !== "approved") throw new Error("Approved media not found");
  await reviewProductMedia(mediaId, "set_primary", actorUserId, "Seller selected primary image");
}

export async function deleteVendorProductMedia(mediaId: string, vendorId: string, actorUserId: string) {
  const databases = db(), media = await databases.getDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: mediaId });
  if (media.vendorId !== vendorId) throw new Error("Media not found");
  if (media.status === "approved") {
    const [product, approved] = await Promise.all([databases.getDocument({ databaseId: databaseId(), collectionId: "products", documentId: String(media.productId) }), listProductMedia(String(media.productId), true)]);
    if (product.status === "approved" && approved.total <= 1) throw new Error("An approved product must retain one approved image");
  }
  await createAppwriteAdminClient("storage").storage.deleteFile({ bucketId: String(media.bucketId), fileId: String(media.fileId) });
  await databases.deleteDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: mediaId });
  await databases.createDocument({ databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [], data: { actorUserId, action: "product_media.delete", entityType: "product", entityId: String(media.productId), metadata: JSON.stringify({ filename: media.filename }), occurredAt: new Date().toISOString() } });
  if (String(media.isPrimary) === "true") {
    const remaining = await listProductMedia(String(media.productId), true);
    if (remaining.documents[0]) await databases.updateDocument({ databaseId: databaseId(), collectionId: "product_media", documentId: remaining.documents[0].$id, data: { isPrimary: "true" } });
  }
}
