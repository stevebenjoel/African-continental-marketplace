import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAppwriteSessionClient } from "@/src/integrations/appwrite/server";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { env } from "@/src/shared/config/env";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  const config = env();
  const session = (await cookies()).get(config.SESSION_COOKIE_NAME)?.value;
  if (!session) return NextResponse.redirect(new URL("/login?returnTo=/account", request.url), 303);
  try {
    await createAppwriteSessionClient(session).account.createEmailVerification({ url: `${config.APP_BASE_URL}/verify-email` });
    return NextResponse.redirect(new URL("/account?verification=sent", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/account?verification=failed", request.url), 303);
  }
}
