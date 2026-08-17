import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";

export async function requireSuperAdmin() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?returnTo=/admin");
  if (!isSuperAdmin(user.labels)) notFound();
  return user;
}
