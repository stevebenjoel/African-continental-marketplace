import { NextResponse } from "next/server";
import { createAppwriteAuthClient } from "@/src/integrations/appwrite/server";
import { emailSchema } from "@/src/modules/auth/domain/credentials";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { env } from "@/src/shared/config/env";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  try {
    const form = await request.formData();
    const email = emailSchema.parse(form.get("email"));
    await createAppwriteAuthClient().account.createRecovery({ email, url: `${env().APP_BASE_URL}/reset-password` });
  } catch { /* Always return the same result to prevent account enumeration. */ }
  return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url), 303);
}
