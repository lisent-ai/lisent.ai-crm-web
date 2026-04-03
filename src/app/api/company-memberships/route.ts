import SuperTokens from "supertokens-node";
import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import {
  getAssignableRolesForAccess,
  hasCompanyPermissionInAccess,
} from "@/lib/auth/access-control";
import { loadAccountIdentity, loadAccountProfile } from "@/lib/auth/account-server";
import {
  addCompanyMembership,
  getCompanyMembership,
  listCompanyMembers,
  type CompanyMemberRecord,
} from "@/lib/auth/company-memberships";
import {
  getCompanyRoleLabel,
  normalizeCompanyRole,
} from "@/lib/auth/roles";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

async function mapMember(member: CompanyMemberRecord) {
  const [identity, account] = await Promise.all([
    loadAccountIdentity(member.userId),
    loadAccountProfile(member.userId),
  ]);

  return {
    userId: member.userId,
    companyId: member.companyId,
    role: member.role,
    roleLabel: getCompanyRoleLabel(member.role),
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    displayName: identity?.displayName ?? member.userId,
    email: identity?.email ?? "",
    platformRole: account?.access.platformRole ?? null,
    isSuperAdmin: account?.access.isSuperAdmin ?? false,
  };
}

export async function GET(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ error: error.message ?? "session validation failed" }, { status: 500 });
    }
    if (!session) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const companyId = request.nextUrl.searchParams.get("company_id")?.trim() ?? "";
    if (!companyId) {
      return Response.json({ error: "company_id is required" }, { status: 400 });
    }

    const actor = await loadAccountProfile(session.getUserId());
    if (!actor) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    if (!hasCompanyPermissionInAccess(actor.access, companyId, "members.read")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const members = await listCompanyMembers(companyId);
    const data = await Promise.all(
      members.map(async (member) => ({
        ...(await mapMember(member)),
        isCurrentUser: member.userId === actor.userId,
      })),
    );

    return Response.json({ data });
  });
}

export async function POST(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ error: error.message ?? "session validation failed" }, { status: 500 });
    }
    if (!session) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const companyId =
      typeof body?.companyId === "string" ? body.companyId.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = normalizeCompanyRole(body?.role);

    if (!companyId || !email || role === null) {
      return Response.json(
        { error: "companyId, email, and role are required" },
        { status: 400 },
      );
    }

    const actor = await loadAccountProfile(session.getUserId());
    if (!actor) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    if (!hasCompanyPermissionInAccess(actor.access, companyId, "members.manage")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!getAssignableRolesForAccess(actor.access, companyId).includes(role)) {
      return Response.json(
        { error: `You cannot assign the ${getCompanyRoleLabel(role)} role.` },
        { status: 403 },
      );
    }

    const users = await SuperTokens.listUsersByAccountInfo("public", { email });
    const user = users[0];
    if (!user) {
      return Response.json(
        { error: "That email is not signed up yet. Ask them to create an account first." },
        { status: 404 },
      );
    }

    const existingMembership = await getCompanyMembership(user.id, companyId);
    if (existingMembership) {
      return Response.json(
        { error: `That user already belongs to this company as ${getCompanyRoleLabel(existingMembership.role)}.` },
        { status: 409 },
      );
    }

    const memberships = await addCompanyMembership(user.id, { companyId, role });
    const nextMembership = memberships.find((membership) => membership.companyId === companyId);
    if (!nextMembership) {
      return Response.json({ error: "Failed to create membership." }, { status: 500 });
    }

    return Response.json(
      await mapMember({ userId: user.id, ...nextMembership }),
      { status: 201 },
    );
  });
}
