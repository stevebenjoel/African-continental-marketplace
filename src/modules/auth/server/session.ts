import "server-only";
import { cookies } from "next/headers";
import { createAppwriteSessionClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export async function getCurrentAppwriteUser() {
  const config = env();
  const sessionSecret = (await cookies()).get(config.SESSION_COOKIE_NAME)?.value;
  if (!sessionSecret) return null;
  try { return await createAppwriteSessionClient(sessionSecret).account.get(); } catch { return null; }
}

export function sessionCookieOptions(expiresAt?: string) {
  const config = env();
  return {
    httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "lax" as const,
    path: "/", priority: "high" as const,
    ...(config.SESSION_COOKIE_DOMAIN ? { domain: config.SESSION_COOKIE_DOMAIN } : {}),
    ...(expiresAt ? { expires: new Date(expiresAt) } : {})
  };
}
