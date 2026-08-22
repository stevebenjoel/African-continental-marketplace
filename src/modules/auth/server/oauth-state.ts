import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/src/shared/config/env";

export const OAUTH_STATE_COOKIE = "pacsm_oauth_state";
export const OAUTH_RETURN_COOKIE = "pacsm_oauth_return_to";

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function validOAuthState(expected?: string, received?: string): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
    priority: "high" as const
  };
}
