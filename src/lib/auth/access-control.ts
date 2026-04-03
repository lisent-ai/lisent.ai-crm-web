import type {
  AccountAccessSummary,
  AccountCompanyMembershipSummary,
} from "@/lib/auth/account-profile";
import {
  canAssignCompanyRole,
  canManageExistingCompanyRole,
  getAssignableCompanyRoles,
  hasCompanyPermission,
  type CompanyPermission,
  type CompanyRole,
} from "@/lib/auth/roles";

export function getCompanyMembershipSummary(
  access: AccountAccessSummary,
  companyId: string,
): AccountCompanyMembershipSummary | null {
  return (
    access.companyMemberships.find((membership) => membership.companyId === companyId) ??
    null
  );
}

export function getCompanyRoleForAccess(
  access: AccountAccessSummary,
  companyId: string,
): CompanyRole | null {
  return getCompanyMembershipSummary(access, companyId)?.role ?? null;
}

export function canAccessCompanyInAccess(
  access: AccountAccessSummary,
  companyId: string,
) {
  return access.isSuperAdmin || getCompanyMembershipSummary(access, companyId) !== null;
}

export function hasCompanyPermissionInAccess(
  access: AccountAccessSummary,
  companyId: string,
  permission: CompanyPermission,
) {
  if (access.isSuperAdmin) {
    return true;
  }

  const role = getCompanyRoleForAccess(access, companyId);
  return role ? hasCompanyPermission(role, permission) : false;
}

export function getAssignableRolesForAccess(
  access: AccountAccessSummary,
  companyId: string,
) {
  return getAssignableCompanyRoles(
    getCompanyRoleForAccess(access, companyId),
    access.isSuperAdmin,
  );
}

export function canAssignRoleInAccess(
  access: AccountAccessSummary,
  companyId: string,
  nextRole: CompanyRole,
) {
  return canAssignCompanyRole(
    getCompanyRoleForAccess(access, companyId),
    nextRole,
    access.isSuperAdmin,
  );
}

export function canManageMembershipRoleInAccess(
  access: AccountAccessSummary,
  companyId: string,
  targetRole: CompanyRole,
) {
  return canManageExistingCompanyRole(
    getCompanyRoleForAccess(access, companyId),
    targetRole,
    access.isSuperAdmin,
  );
}
