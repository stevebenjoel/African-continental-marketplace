import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAppwriteSessionClient } from "@/src/integrations/appwrite/server";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { env } from "@/src/shared/config/env";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  const config = env();
  const session = (await cookies()).get(config.SESSION_COOKIE_NAME)?.value;
  if (!session) return NextResponse.redirect(publicAppUrl("/login?returnTo=/account"), 303);
  try {
    const account = createAppwriteSessionClient(session).account;
    const user = await account.get();
    if (user.emailVerification) return NextResponse.redirect(publicAppUrl("/account?verification=already"), 303);
    await account.createEmailVerification({ url: publicAppUrl("/verify-email").toString() });
    return NextResponse.redirect(publicAppUrl("/account?verification=sent"), 303);
  } catch {
    return NextResponse.redirect(publicAppUrl("/account?verification=failed"), 303);
  }
}
