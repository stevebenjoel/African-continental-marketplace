import { NextRequest, NextResponse } from "next/server";
import { requireOfftakerStaff } from "@/src/modules/authorization/server/require-offtaker-staff";
import { resolveDispute } from "@/src/modules/offtake/server/repository";
export async function POST(request: NextRequest, context: { params: Promise<{ disputeId: string }> }) { await requireOfftakerStaff(); const { disputeId } = await context.params; const form = await request.formData(); await resolveDispute(disputeId, String(form.get("status") ?? ""), String(form.get("resolution") ?? "")); return NextResponse.redirect(new URL("/admin/offtakers", request.url), 303); }
