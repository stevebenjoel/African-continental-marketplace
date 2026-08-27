import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdminRole } from "@/src/modules/authorization/domain/admin-roles";
export async function requireOrderOperations(returnTo = "/operations") { const user = await getCurrentAppwriteUser(); if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`); if (!user.labels.includes("superadmin")&&!hasAdminRole(user.labels,["order_fulfilment_manager"])) notFound(); return user; }
