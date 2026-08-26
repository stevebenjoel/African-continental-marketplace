import { NextResponse } from "next/server";
import { z } from "zod";
import { readOAuthState } from "@/src/modules/auth/server/oauth-state";
import { createAppwriteTokenSession } from "@/src/modules/auth/server/appwrite-token-session";
import { publicAppUrl, safeReturnTo } from "@/src/modules/auth/server/request-security";
import { sessionCookieOptions } from "@/src/modules/auth/server/session";
import { env } from "@/src/shared/config/env";

const callbackSchema = z.object({
  userId: z.string().min(1).max(64),
  secret: z.string().min(1).max(512),
  state: z.string().min(80).max(2048)
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clearAndRedirect = (path: string) => {
    return NextResponse.redirect(publicAppUrl(path), 303);
  };

  try {
    const input = callbackSchema.parse(Object.fromEntries(url.searchParams));
    const oauthState = readOAuthState(input.state);
    if (!oauthState) {
      return clearAndRedirect("/login?error=oauth_state");
    }
    const session = await createAppwriteTokenSession({
      userId: input.userId,
      tokenSecret: input.secret
    });
    const returnTo = safeReturnTo(oauthState.returnTo);
    const response = clearAndRedirect(returnTo === "/account" ? "/account?oauth=google" : returnTo);
    response.cookies.set(env().SESSION_COOKIE_NAME, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return clearAndRedirect("/login?error=oauth_failed");
  }
}
