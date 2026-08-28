import "server-only";
import { notFound,redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdminRole } from "@/src/modules/authorization/domain/admin-roles";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";
export async function requireAcademyLearner(returnTo="/academy"){const user=await getCurrentAppwriteUser();if(!user)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);return user}
export async function requireAcademyStaff(returnTo="/admin/academy"){const user=await getCurrentAppwriteUser();if(!user)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);if(!isSuperAdmin(user.labels)&&!hasAdminRole(user.labels,["academy_admin","academy_content_manager","academy_instructor","academy_assessor"]))notFound();return user}
