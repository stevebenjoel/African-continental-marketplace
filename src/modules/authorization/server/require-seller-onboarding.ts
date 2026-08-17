import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
export async function requireSellerOnboarding() { const user = await getCurrentAppwriteUser(); if (!user) redirect("/login?returnTo=/onboarding/sellers"); if (!user.labels.some(label => ["superadmin", "seller_onboarding_manager"].includes(label))) notFound(); return user; }
