import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
const databaseId = () => env().APPWRITE_DATABASE_ID; const db = () => createAppwriteDatabaseClient().databases;
export const listAddresses = (userId: string) => db().listDocuments({ databaseId: databaseId(), collectionId: "customer_addresses", queries: [Query.equal("userId", userId), Query.equal("status", "active"), Query.limit(20)] });
export const createAddress = (data: { userId: string; label: string; recipientName: string; phone: string; line1: string; line2: string; city: string; region: string; postalCode: string; countryCode: string }) => db().createDocument({ databaseId: databaseId(), collectionId: "customer_addresses", documentId: ID.unique(), permissions: [], data: { ...data, ...(data.line2 ? { line2: data.line2 } : {}), ...(data.postalCode ? { postalCode: data.postalCode } : {}), status: "active" } });
