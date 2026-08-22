import { ID } from "node-appwrite";
import { NextResponse } from "next/server";
import { createAppwriteAuthClient } from "@/src/integrations/appwrite/server";
import { registrationSchema } from "@/src/modules/auth/domain/credentials";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { sessionCookieOptions } from "@/src/modules/auth/server/session";
import { env } from "@/src/shared/config/env";
import { createAppwriteSessionClient } from "@/src/integrations/appwrite/server";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  try {
    const form = await request.formData();
    const input = registrationSchema.parse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
    const { account } = createAppwriteAuthClient();
    await account.create({ userId: ID.unique(), ...input });
    const session = await account.createEmailPasswordSession({ email: input.email, password: input.password });
    if (!session.secret) throw new Error("Missing Appwrite server session secret");
    let verification = "sent";
    try {
      await createAppwriteSessionClient(session.secret).account.createEmailVerification({ url: publicAppUrl("/verify-email").toString() });
    } catch { verification = "unavailable"; }
    const response = NextResponse.redirect(publicAppUrl(`/account?welcome=1&verification=${verification}`), 303);
    response.cookies.set(env().SESSION_COOKIE_NAME, session.secret, sessionCookieOptions(session.expire));
    return response;
  } catch {
    return NextResponse.redirect(publicAppUrl("/register?error=registration_failed"), 303);
  }
}
