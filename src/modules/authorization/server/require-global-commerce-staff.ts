import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdminRole } from "@/src/modules/authorization/domain/admin-roles";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";

const GLOBAL_COMMERCE_ROLES = ["global_commerce_manager", "supplier_integration_manager", "global_catalogue_manager", "global_pricing_manager", "global_order_manager", "global_logistics_manager", "global_finance_reviewer"] as const;

export async function requireGlobalCommerceStaff() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?returnTo=/admin/global-commerce");
  if (!isSuperAdmin(user.labels) && !hasAdminRole(user.labels, GLOBAL_COMMERCE_ROLES)) notFound();
  return { user, canManageCredentials: isSuperAdmin(user.labels), canImportProducts: isSuperAdmin(user.labels) || hasAdminRole(user.labels,["global_commerce_manager","global_catalogue_manager"]) };
}
