import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/src/shared/config/env";
import { readSecret } from "@/src/shared/security/server-secret";
import { createSignedOAuthState, verifySignedOAuthState } from "@/src/modules/auth/domain/oauth-state";

function secret() {
  const config = env();
  if (config.NODE_ENV !== "production") {
    const state = globalThis as typeof globalThis & { __pacsmOAuthStateSecret?: string };
    state.__pacsmOAuthStateSecret ??= randomBytes(32).toString("base64url");
    return state.__pacsmOAuthStateSecret;
  }
  return readSecret(config.APPWRITE_API_KEY, config.APPWRITE_API_KEY_FILE, "OAuth state signing key");
}

export function createOAuthState(returnTo: string): string {
  return createSignedOAuthState({ secret: secret(), returnTo });
}

export function readOAuthState(token?: string) {
  return verifySignedOAuthState({ token, secret: secret() });
}
