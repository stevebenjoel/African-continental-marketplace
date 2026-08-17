import "server-only";
import { ID, Query } from "node-appwrite";
import { randomBytes } from "node:crypto";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
const databaseId = () => env().APPWRITE_DATABASE_ID; const db = () => createAppwriteDatabaseClient().databases;
export const listCredentials = (vendorId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "api_credentials", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("createdAt"), Query.limit(100)] });
export const listWebhookEndpoints = (vendorId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "webhook_endpoints", queries: [Query.equal("vendorId", vendorId), Query.limit(100)] });
export const listWebhookDeliveries = (vendorId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "webhook_deliveries", queries: [Query.equal("vendorId", vendorId), Query.orderDesc("createdAt"), Query.limit(100)] });
export async function createWebhookEndpoint(vendorId: string, url: string, events: string[]) { const parsed = new URL(url); if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("Webhook URL must use HTTPS"); return db().createDocument({ databaseId: databaseId(), collectionId: "webhook_endpoints", documentId: ID.unique(), permissions: [], data: { vendorId, url, signingSecret: randomBytes(32).toString("hex"), events, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }); }
export async function revokeApiCredential(vendorId: string, credentialId: string) { const credential = await db().getDocument({ databaseId: databaseId(), collectionId: "api_credentials", documentId: credentialId }); if (credential.vendorId !== vendorId) throw new Error("Credential not found"); return db().updateDocument({ databaseId: databaseId(), collectionId: "api_credentials", documentId: credentialId, data: { status: "revoked", revokedAt: new Date().toISOString() } }); }
