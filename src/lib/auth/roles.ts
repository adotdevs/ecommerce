import { ADMIN_ROLES } from "@/config/permissions";

export function hasAnyAdminRole(roles: string[] | undefined): boolean {
  return (roles ?? []).some((r) => ADMIN_ROLES.includes(r));
}

export function isCustomerUser(roles: string[] | undefined): boolean {
  return !hasAnyAdminRole(roles);
}
