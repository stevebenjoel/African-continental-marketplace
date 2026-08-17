export const SUPER_ADMIN_LABEL = "superadmin";

export function isSuperAdmin(labels: readonly string[] | undefined): boolean {
  return labels?.includes(SUPER_ADMIN_LABEL) ?? false;
}
