import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";

export async function requireTradeStaff(returnTo = "/admin/trade") {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (!user.labels.includes("superadmin") && !user.labels.includes("trade_compliance")) notFound();
  return user;
}
