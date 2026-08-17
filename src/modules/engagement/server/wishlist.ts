import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;
export const listWishlist = (userId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "wishlists", queries: [Query.equal("userId", userId), Query.orderDesc("createdAt"), Query.limit(100)] });
export async function addWishlist(userId: string, productId: string) { await db().getDocument({ databaseId: databaseId(), collectionId: "products", documentId: productId }); const existing = await db().listDocuments({ databaseId: databaseId(), collectionId: "wishlists", queries: [Query.equal("userId", userId), Query.equal("productId", productId), Query.limit(1)] }); if (!existing.documents[0]) await db().createDocument({ databaseId: databaseId(), collectionId: "wishlists", documentId: ID.unique(), permissions: [], data: { userId, productId, createdAt: new Date().toISOString() } }); }
export async function removeWishlist(userId: string, wishlistId: string) { const item = await db().getDocument({ databaseId: databaseId(), collectionId: "wishlists", documentId: wishlistId }); if (String(item.userId) !== userId) throw new Error("Wishlist item not found"); await db().deleteDocument({ databaseId: databaseId(), collectionId: "wishlists", documentId: wishlistId }); }
