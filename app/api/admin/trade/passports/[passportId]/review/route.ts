import {assertSameOrigin, publicAppUrl} from "@/src/modules/auth/server/request-security";
import { requireTradeStaff } from "@/src/modules/authorization/server/require-trade-staff";
import { isTradePassportAction } from "@/src/modules/trade/domain/readiness";
import { reviewTradePassport } from "@/src/modules/trade/server/repository";

export async function POST(request: Request, { params }: { params: Promise<{ passportId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); }
  const user = await requireTradeStaff(); const form = await request.formData(), action = String(form.get("action") ?? ""), notes = String(form.get("notes") ?? "").trim();
  if (!isTradePassportAction(action)) return new Response("Invalid action", { status: 400 });
  const { passportId } = await params; await reviewTradePassport(passportId, action, notes, user.$id);
  return Response.redirect(publicAppUrl(`/admin/trade/${passportId}?reviewed=1`), 303);
}
