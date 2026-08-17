import "server-only";
import { Account, Client, Databases, Storage, Users } from "node-appwrite";
import { env } from "@/src/shared/config/env";
import { readSecret } from "@/src/shared/security/server-secret";

function baseClient() {
  const config = env();
  return new Client().setEndpoint(config.APPWRITE_ENDPOINT).setProject(config.APPWRITE_PROJECT_ID);
}

export function createAppwriteAdminClient(scope: "auth" | "storage" | "database") {
  const config = env();
  const scopedKey = scope === "auth" ? config.APPWRITE_AUTH_API_KEY : scope === "storage" ? config.APPWRITE_STORAGE_API_KEY : config.APPWRITE_DATABASE_API_KEY;
  const scopedKeyFile = scope === "auth" ? config.APPWRITE_AUTH_API_KEY_FILE : scope === "storage" ? config.APPWRITE_STORAGE_API_KEY_FILE : config.APPWRITE_DATABASE_API_KEY_FILE;
  const apiKey = readSecret(scopedKey, scopedKeyFile, `Appwrite ${scope} runtime key`);
  const client = baseClient().setKey(apiKey);
  return { account: new Account(client), users: new Users(client), storage: new Storage(client), databases: new Databases(client) };
}

export const createAppwriteAuthClient = () => createAppwriteAdminClient("auth");
export const createAppwriteDatabaseClient = () => createAppwriteAdminClient("database");

export function createAppwriteSessionClient(sessionSecret: string) {
  const client = baseClient().setSession(sessionSecret);
  return { account: new Account(client) };
}
