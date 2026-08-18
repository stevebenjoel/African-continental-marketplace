import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createAppwriteSessionClient } from "@/src/integrations/appwrite/server";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { env } from "@/src/shared/config/env";

const verificationSchema = z.object({ userId: z.string().min(1).max(64), secret: z.string().min(1).max(512) });

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  const session = (await cookies()).get(env().SESSION_COOKIE_NAME)?.value;
  if (!session) return NextResponse.redirect(publicAppUrl("/login?returnTo=/account"), 303);
  try {
    const form = await request.formData();
    const input = verificationSchema.parse({ userId: form.get("userId"), secret: form.get("secret") });
    await createAppwriteSessionClient(session).account.updateEmailVerification(input);
    return NextResponse.redirect(publicAppUrl("/account?verification=complete"), 303);
  } catch {
    return NextResponse.redirect(publicAppUrl("/verify-email?error=invalid_or_expired"), 303);
  }
}
