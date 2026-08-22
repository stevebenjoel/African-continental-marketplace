import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAppwritePublicAccountClient } from "@/src/integrations/appwrite/server";
import { OAUTH_RETURN_COOKIE, OAUTH_STATE_COOKIE, validOAuthState } from "@/src/modules/auth/server/oauth-state";
import { publicAppUrl, safeReturnTo } from "@/src/modules/auth/server/request-security";
import { sessionCookieOptions } from "@/src/modules/auth/server/session";
import { env } from "@/src/shared/config/env";

const callbackSchema = z.object({
  userId: z.string().min(1).max(64),
  secret: z.string().min(1).max(512),
  state: z.string().min(20).max(128)
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const clearAndRedirect = (path: string) => {
    const response = NextResponse.redirect(publicAppUrl(path), 303);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_RETURN_COOKIE);
    return response;
  };

  try {
    const input = callbackSchema.parse(Object.fromEntries(url.searchParams));
    if (!validOAuthState(cookieStore.get(OAUTH_STATE_COOKIE)?.value, input.state)) {
      return clearAndRedirect("/login?error=oauth_state");
    }
    const session = await createAppwritePublicAccountClient().account.createSession({
      userId: input.userId,
      secret: input.secret
    });
    if (!session.secret) throw new Error("Missing Appwrite OAuth session secret");
    const returnTo = safeReturnTo(cookieStore.get(OAUTH_RETURN_COOKIE)?.value ?? null);
    const response = clearAndRedirect(returnTo === "/account" ? "/account?oauth=google" : returnTo);
    response.cookies.set(env().SESSION_COOKIE_NAME, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch {
    return clearAndRedirect("/login?error=oauth_failed");
  }
}
