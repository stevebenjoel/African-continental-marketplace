import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { updateProposalStatus } from "@/src/modules/offtake/server/repository";
export async function POST(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) { try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); } const user = await getCurrentAppwriteUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const { proposalId } = await context.params; const form = await request.formData(); await updateProposalStatus(user.$id, proposalId, String(form.get("status") ?? "")); return NextResponse.redirect(new URL("/offtakers", request.url), 303); }
