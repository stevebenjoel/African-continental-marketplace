import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { createDispute } from "@/src/modules/offtake/server/repository";
export async function POST(request: NextRequest) { try { assertSameOrigin(request); } catch { return new Response("Forbidden", { status: 403 }); } const user = await getCurrentAppwriteUser(); if (!user) return new Response("Unauthorized", { status: 401 }); const form = await request.formData(); await createDispute(user.$id, String(form.get("agreementId") ?? ""), String(form.get("scheduleId") ?? ""), String(form.get("category") ?? ""), String(form.get("description") ?? "")); return NextResponse.redirect(new URL("/offtakers", request.url), 303); }
