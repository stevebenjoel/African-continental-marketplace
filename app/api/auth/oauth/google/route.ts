import { OAuthProvider } from "node-appwrite";
import { NextResponse } from "next/server";
import { createAppwritePublicAccountClient } from "@/src/integrations/appwrite/server";
import { createOAuthState, oauthCookieOptions, OAUTH_RETURN_COOKIE, OAUTH_STATE_COOKIE } from "@/src/modules/auth/server/oauth-state";
import { publicAppUrl, safeReturnTo } from "@/src/modules/auth/server/request-security";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = safeReturnTo(requestUrl.searchParams.get("returnTo"));
  const state = createOAuthState();
  const success = publicAppUrl(`/api/auth/oauth/google/callback?state=${encodeURIComponent(state)}`).toString();
  const failure = publicAppUrl(`/api/auth/oauth/google/failure?state=${encodeURIComponent(state)}`).toString();

  try {
    const target = await createAppwritePublicAccountClient().account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success,
      failure,
      scopes: ["openid", "email", "profile"]
    });
    const response = NextResponse.redirect(target, 303);
    response.cookies.set(OAUTH_STATE_COOKIE, state, oauthCookieOptions());
    response.cookies.set(OAUTH_RETURN_COOKIE, returnTo, oauthCookieOptions());
    return response;
  } catch {
    return NextResponse.redirect(publicAppUrl("/login?error=oauth_unavailable"), 303);
  }
}
