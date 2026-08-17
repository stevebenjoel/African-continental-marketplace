import { NextRequest, NextResponse } from "next/server";
import { requireOfftakerStaff } from "@/src/modules/authorization/server/require-offtaker-staff";
import { recordMilestonePayment } from "@/src/modules/offtake/server/repository";
export async function POST(request: NextRequest, context: { params: Promise<{ milestoneId: string }> }) { await requireOfftakerStaff(); const { milestoneId } = await context.params; const form = await request.formData(); await recordMilestonePayment(milestoneId, String(form.get("status") ?? "")); return NextResponse.redirect(new URL("/admin/offtakers", request.url), 303); }
