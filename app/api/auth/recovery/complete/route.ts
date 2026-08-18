import { NextResponse } from "next/server";
import { z } from "zod";
import { createAppwriteAuthClient } from "@/src/integrations/appwrite/server";
import { strongPasswordSchema } from "@/src/modules/auth/domain/credentials";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";

const recoverySchema = z.object({ userId: z.string().min(1).max(64), secret: z.string().min(1).max(512), password: strongPasswordSchema });

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); }
  try {
    const form = await request.formData();
    const input = recoverySchema.parse({ userId: form.get("userId"), secret: form.get("secret"), password: form.get("password") });
    await createAppwriteAuthClient().account.updateRecovery(input);
    return NextResponse.redirect(publicAppUrl("/login?recovered=1"), 303);
  } catch {
    return NextResponse.redirect(publicAppUrl("/reset-password?error=invalid_or_expired"), 303);
  }
}
