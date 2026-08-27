import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdminRole } from "@/src/modules/authorization/domain/admin-roles";
export async function requireSellerOnboarding() { const user = await getCurrentAppwriteUser(); if (!user) redirect("/login?returnTo=/onboarding/sellers"); if (!user.labels.includes("superadmin")&&!hasAdminRole(user.labels,["seller_onboarding_manager"])) notFound(); return user; }
