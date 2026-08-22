import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, OAUTH_RETURN_COOKIE, validOAuthState } from "@/src/modules/auth/server/oauth-state";
import { publicAppUrl } from "@/src/modules/auth/server/request-security";

export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state") ?? undefined;
  const expected = (await cookies()).get(OAUTH_STATE_COOKIE)?.value;
  const error = validOAuthState(expected, state) ? "oauth_cancelled" : "oauth_state";
  const response = NextResponse.redirect(publicAppUrl(`/login?error=${error}`), 303);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_RETURN_COOKIE);
  return response;
}
