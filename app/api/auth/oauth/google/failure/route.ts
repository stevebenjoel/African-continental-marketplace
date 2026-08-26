import { NextResponse } from "next/server";
import { readOAuthState } from "@/src/modules/auth/server/oauth-state";
import { publicAppUrl } from "@/src/modules/auth/server/request-security";

export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state") ?? undefined;
  const error = readOAuthState(state) ? "oauth_cancelled" : "oauth_state";
  return NextResponse.redirect(publicAppUrl(`/login?error=${error}`), 303);
}
