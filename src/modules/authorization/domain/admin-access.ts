import { grantedAdminRoles } from "@/src/modules/authorization/domain/admin-roles";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";

export const hasAdministrativeAccess=(labels:readonly string[]|undefined)=>isSuperAdmin(labels)||grantedAdminRoles(labels).length>0;
