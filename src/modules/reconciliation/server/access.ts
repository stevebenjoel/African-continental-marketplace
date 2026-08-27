import "server-only";
import { notFound,redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdminRole } from "@/src/modules/authorization/domain/admin-roles";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";

export async function requireReconciliationAccess(returnTo="/admin/reconciliation"){
  const user=await getCurrentAppwriteUser();if(!user)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  if(!isSuperAdmin(user.labels)&&!hasAdminRole(user.labels,["finance_officer","order_fulfilment_manager"]))notFound();
  return user;
}
