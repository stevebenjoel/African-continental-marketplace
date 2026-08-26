import { OAuthProvider } from "node-appwrite";
import { NextResponse } from "next/server";
import { createAppwritePublicAccountClient } from "@/src/integrations/appwrite/server";
import { createOAuthState } from "@/src/modules/auth/server/oauth-state";
import { publicAppUrl, safeReturnTo } from "@/src/modules/auth/server/request-security";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = safeReturnTo(requestUrl.searchParams.get("returnTo"));
  const state = createOAuthState(returnTo);
  const success = publicAppUrl(`/api/auth/oauth/google/callback?state=${encodeURIComponent(state)}`).toString();
  const failure = publicAppUrl(`/api/auth/oauth/google/failure?state=${encodeURIComponent(state)}`).toString();

  try {
    const target = await createAppwritePublicAccountClient().account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success,
      failure,
      scopes: ["openid", "email", "profile"]
    });
    return NextResponse.redirect(target, 303);
  } catch (error) {
    console.error("Google OAuth initialization failed", error);
    return NextResponse.redirect(publicAppUrl("/login?error=oauth_unavailable"), 303);
  }
}
