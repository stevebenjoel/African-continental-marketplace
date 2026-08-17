import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { hasScope, type ApiScope } from "@/src/modules/integrations/domain/scopes";

const databaseId = () => env().APPWRITE_DATABASE_ID;
const db = () => createAppwriteDatabaseClient().databases;
const digest = (key: string) => createHash("sha256").update(key).digest("hex");

export async function createApiCredential(input: { vendorId: string; name: string; scopes: ApiScope[]; environment: "sandbox" | "live" }) {
  const token = randomBytes(32).toString("base64url"), keyPrefix = `pacsm_${input.environment}_${randomBytes(6).toString("hex")}`, apiKey = `${keyPrefix}.${token}`;
  const credential = await db().createDocument({ databaseId: databaseId(), collectionId: "api_credentials", documentId: ID.unique(), permissions: [], data: { vendorId: input.vendorId, name: input.name, keyPrefix, keyHash: digest(apiKey), scopes: input.scopes, environment: input.environment, status: "active", rateLimitPerMinute: input.environment === "live" ? 120 : 30, createdAt: new Date().toISOString() } });
  return { credential, apiKey };
}

export async function authenticateMerchantRequest(request: Request, requiredScope: ApiScope) {
  const authorization = request.headers.get("authorization") ?? "", apiKey = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const keyPrefix = apiKey.split(".")[0]; if (!apiKey || !keyPrefix) return null;
  const matches = await db().listDocuments({ databaseId: databaseId(), collectionId: "api_credentials", queries: [Query.equal("keyPrefix", keyPrefix), Query.equal("status", "active"), Query.limit(1)] });
  const credential = matches.documents[0]; if (!credential) return null;
  const supplied = Buffer.from(digest(apiKey), "hex"), stored = Buffer.from(String(credential.keyHash), "hex");
  if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored) || !hasScope(credential.scopes as string[], requiredScope)) return null;
  const since = new Date(Date.now() - 60_000).toISOString(), usage = await db().listDocuments({ databaseId: databaseId(), collectionId: "api_usage", queries: [Query.equal("credentialId", credential.$id), Query.greaterThanEqual("occurredAt", since), Query.limit(Number(credential.rateLimitPerMinute) + 1)] });
  if (usage.total >= Number(credential.rateLimitPerMinute)) return { rateLimited: true as const, credential };
  await db().updateDocument({ databaseId: databaseId(), collectionId: "api_credentials", documentId: credential.$id, data: { lastUsedAt: new Date().toISOString() } });
  return { rateLimited: false as const, credential, vendorId: String(credential.vendorId) };
}

export async function recordApiUsage(credentialId: string, vendorId: string, request: Request, statusCode: number) {
  await db().createDocument({ databaseId: databaseId(), collectionId: "api_usage", documentId: ID.unique(), permissions: [], data: { credentialId, vendorId, route: new URL(request.url).pathname, method: request.method, statusCode, occurredAt: new Date().toISOString() } });
}

export function apiError(message: string, status: number) { return Response.json({ error: { message, status } }, { status, headers: { "Cache-Control": "no-store", "X-PACSM-API-Version": "v1" } }); }
