import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAppwriteSessionClient } from "@/src/integrations/appwrite/server";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { env } from "@/src/shared/config/env";

export async function POST(request: Request) {
  const config = env();
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  const sessionSecret = (await cookies()).get(config.SESSION_COOKIE_NAME)?.value;
  try {
    if (sessionSecret) await createAppwriteSessionClient(sessionSecret).account.deleteSession({ sessionId: "current" });
  } catch { /* Always clear the local cookie when the upstream session is already invalid. */ }
  const response = NextResponse.redirect(publicAppUrl("/"), 303);
  response.cookies.set(config.SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: config.NODE_ENV === "production" });
  return response;
}
