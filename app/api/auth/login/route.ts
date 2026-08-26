import { NextResponse } from "next/server";
import { loginSchema } from "@/src/modules/auth/domain/credentials";
import { assertSameOrigin, publicAppUrl, safeReturnTo } from "@/src/modules/auth/server/request-security";
import { sessionCookieOptions } from "@/src/modules/auth/server/session";
import { env } from "@/src/shared/config/env";
import { extractAppwriteSessionSecret } from "@/src/modules/auth/domain/appwrite-session-cookie";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  try {
    const form = await request.formData();
    const input = loginSchema.parse({ email: form.get("email"), password: form.get("password") });
    const config = env();
    const appwriteResponse = await fetch(`${config.APPWRITE_ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Appwrite-Project": config.APPWRITE_PROJECT_ID },
      body: JSON.stringify(input),
      cache: "no-store"
    });
    const session = await appwriteResponse.json() as { expire?: string; message?: string };
    if (!appwriteResponse.ok) throw new Error(session.message ?? "Appwrite rejected the login");
    const sessionSecret = extractAppwriteSessionSecret(appwriteResponse.headers.getSetCookie(), config.APPWRITE_PROJECT_ID);
    if (!sessionSecret) throw new Error("Appwrite did not return a server session cookie");
    const response = NextResponse.redirect(publicAppUrl(safeReturnTo(form.get("returnTo"))), 303);
    response.cookies.set(config.SESSION_COOKIE_NAME, sessionSecret, sessionCookieOptions(session.expire));
    return response;
  } catch (error) {
    const diagnostic = error && typeof error === "object" ? {
      code: "code" in error ? error.code : undefined,
      type: "type" in error ? error.type : undefined,
      message: "message" in error ? error.message : undefined
    } : { message: "Unknown login failure" };
    console.error("Appwrite login failed", diagnostic);
    const config = env();
    const failureUrl = publicAppUrl("/login?error=invalid_credentials");
    if (config.NODE_ENV === "development") failureUrl.searchParams.set("reason", String(diagnostic.type ?? diagnostic.code ?? diagnostic.message ?? "unknown"));
    return NextResponse.redirect(failureUrl, 303);
  }
}
