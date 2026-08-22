import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin, publicAppUrl } from "@/src/modules/auth/server/request-security";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";
import { reviewProductMedia } from "@/src/modules/catalogue/server/media";

export async function POST(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await getCurrentAppwriteUser();
  if (!user || !isSuperAdmin(user.labels)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData(), action = String(form.get("action"));
  if (!['approve', 'reject', 'set_primary'].includes(action)) return new Response("Invalid action", { status: 400 });
  const { mediaId } = await params;
  try {
    await reviewProductMedia(mediaId, action as "approve" | "reject" | "set_primary", user.$id, String(form.get("notes") ?? ""));
    return Response.redirect(publicAppUrl("/admin/catalogue?media=updated"), 303);
  } catch { return Response.redirect(publicAppUrl("/admin/catalogue?error=media"), 303); }
}
