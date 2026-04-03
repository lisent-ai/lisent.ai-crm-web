export const platformRoles = ["super_admin"] as const;
export type PlatformRole = (typeof platformRoles)[number];

export const companyRoles = ["owner", "admin", "member", "viewer"] as const;
export type CompanyRole = (typeof companyRoles)[number];

export type CompanyPermission =
  | "company.read"
  | "company.update"
  | "company.delete"
  | "customers.read"
  | "customers.write"
  | "imports.run"
  | "imports.manage"
  | "integrations.manage"
  | "qualifier.manage"
  | "members.read"
  | "members.manage";

const rolePermissions: Record<CompanyRole, CompanyPermission[]> = {
  owner: [
    "company.read",
    "company.update",
    "company.delete",
    "customers.read",
    "customers.write",
    "imports.run",
    "imports.manage",
    "integrations.manage",
    "qualifier.manage",
    "members.read",
    "members.manage",
  ],
  admin: [
    "company.read",
    "company.update",
    "customers.read",
    "customers.write",
    "imports.run",
    "imports.manage",
    "integrations.manage",
    "qualifier.manage",
    "members.read",
    "members.manage",
  ],
  member: ["company.read", "customers.read", "customers.write", "imports.run"],
  viewer: ["company.read", "customers.read"],
};

export function normalizePlatformRole(raw: unknown): PlatformRole | null {
  return raw === "super_admin" ? "super_admin" : null;
}

export function normalizeCompanyRole(raw: unknown): CompanyRole | null {
  if (typeof raw !== "string") {
    return null;
  }

  return companyRoles.includes(raw as CompanyRole) ? (raw as CompanyRole) : null;
}

export function hasCompanyPermission(
  role: CompanyRole,
  permission: CompanyPermission,
) {
  return rolePermissions[role].includes(permission);
}

export function getCompanyRoleLabel(role: CompanyRole) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "viewer":
      return "Viewer";
  }
}

export function getPlatformRoleLabel(role: PlatformRole | null) {
  return role === "super_admin" ? "Super Admin" : "Workspace User";
}

export function getAssignableCompanyRoles(
  actorRole: CompanyRole | null,
  isSuperAdmin = false,
): CompanyRole[] {
  if (isSuperAdmin) {
    return [...companyRoles];
  }

  if (actorRole === "owner") {
    return ["admin", "member", "viewer"];
  }

  if (actorRole === "admin") {
    return ["member", "viewer"];
  }

  return [];
}

export function canAssignCompanyRole(
  actorRole: CompanyRole | null,
  nextRole: CompanyRole,
  isSuperAdmin = false,
) {
  return getAssignableCompanyRoles(actorRole, isSuperAdmin).includes(nextRole);
}

export function canManageExistingCompanyRole(
  actorRole: CompanyRole | null,
  targetRole: CompanyRole,
  isSuperAdmin = false,
) {
  if (isSuperAdmin) {
    return true;
  }

  if (actorRole === "owner") {
    return targetRole !== "owner";
  }

  if (actorRole === "admin") {
    return targetRole === "member" || targetRole === "viewer";
  }

  return false;
}
