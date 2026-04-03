import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import {
  canManageMembershipRoleInAccess,
  getAssignableRolesForAccess,
  hasCompanyPermissionInAccess,
} from "@/lib/auth/access-control";
import { loadAccountIdentity, loadAccountProfile } from "@/lib/auth/account-server";
import {
  getCompanyMembership,
  listCompanyMembers,
  removeCompanyMembership,
  updateCompanyMembershipRole,
} from "@/lib/auth/company-memberships";
import {
  getCompanyRoleLabel,
  normalizeCompanyRole,
} from "@/lib/auth/roles";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

async function mapMember(userId: string, companyId: string) {
  const [membership, identity, account] = await Promise.all([
    getCompanyMembership(userId, companyId),
    loadAccountIdentity(userId),
    loadAccountProfile(userId),
  ]);

  if (!membership) {
    return null;
  }

  return {
    userId,
    companyId,
    role: membership.role,
    roleLabel: getCompanyRoleLabel(membership.role),
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
    displayName: identity?.displayName ?? userId,
    email: identity?.email ?? "",
    platformRole: account?.access.platformRole ?? null,
    isSuperAdmin: account?.access.isSuperAdmin ?? false,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ error: error.message ?? "session validation failed" }, { status: 500 });
    }
    if (!session) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const { userId } = await context.params;
    const companyId = request.nextUrl.searchParams.get("company_id")?.trim() ?? "";
    if (!companyId) {
      return Response.json({ error: "company_id is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const nextRole = normalizeCompanyRole(body?.role);
    if (!nextRole) {
      return Response.json({ error: "role is required" }, { status: 400 });
    }

    const actor = await loadAccountProfile(session.getUserId());
    if (!actor) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    const membership = await getCompanyMembership(userId, companyId);
    if (!membership) {
      return Response.json({ error: "membership not found" }, { status: 404 });
    }

    if (!hasCompanyPermissionInAccess(actor.access, companyId, "members.manage")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!canManageMembershipRoleInAccess(actor.access, companyId, membership.role)) {
      return Response.json(
        { error: `You cannot change an ${getCompanyRoleLabel(membership.role)} membership.` },
        { status: 403 },
      );
    }

    if (!getAssignableRolesForAccess(actor.access, companyId).includes(nextRole)) {
      return Response.json(
        { error: `You cannot assign the ${getCompanyRoleLabel(nextRole)} role.` },
        { status: 403 },
      );
    }

    if (membership.role === "owner" && nextRole !== "owner") {
      const members = await listCompanyMembers(companyId);
      const ownerCount = members.filter((member) => member.role === "owner").length;
      if (ownerCount <= 1) {
        return Response.json(
          { error: "Every company needs at least one owner." },
          { status: 409 },
        );
      }
    }

    await updateCompanyMembershipRole(userId, companyId, nextRole);
    const nextMember = await mapMember(userId, companyId);
    if (!nextMember) {
      return Response.json({ error: "membership not found" }, { status: 404 });
    }

    return Response.json(nextMember);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ error: error.message ?? "session validation failed" }, { status: 500 });
    }
    if (!session) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const { userId } = await context.params;
    const companyId = request.nextUrl.searchParams.get("company_id")?.trim() ?? "";
    if (!companyId) {
      return Response.json({ error: "company_id is required" }, { status: 400 });
    }

    const actor = await loadAccountProfile(session.getUserId());
    if (!actor) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    const membership = await getCompanyMembership(userId, companyId);
    if (!membership) {
      return Response.json({ error: "membership not found" }, { status: 404 });
    }

    if (!hasCompanyPermissionInAccess(actor.access, companyId, "members.manage")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!canManageMembershipRoleInAccess(actor.access, companyId, membership.role)) {
      return Response.json(
        { error: `You cannot remove an ${getCompanyRoleLabel(membership.role)} membership.` },
        { status: 403 },
      );
    }

    if (membership.role === "owner") {
      const members = await listCompanyMembers(companyId);
      const ownerCount = members.filter((member) => member.role === "owner").length;
      if (ownerCount <= 1) {
        return Response.json(
          { error: "Every company needs at least one owner." },
          { status: 409 },
        );
      }
    }

    await removeCompanyMembership(userId, companyId);
    return new Response(null, { status: 204 });
  });
}
