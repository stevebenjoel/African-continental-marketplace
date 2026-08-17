import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
export async function requireOrderOperations(returnTo = "/operations") { const user = await getCurrentAppwriteUser(); if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`); if (!user.labels.some(label => ["superadmin", "order_fulfilment_manager"].includes(label))) notFound(); return user; }
