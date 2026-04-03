"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addCompanyMember,
  CompanyMembershipClientError,
  listCompanyMembers,
  removeCompanyMember,
  type CompanyMember,
  updateCompanyMemberRole,
} from "@/lib/auth/company-membership-client";
import {
  canManageMembershipRoleInAccess,
  getAssignableRolesForAccess,
  getCompanyRoleForAccess,
  hasCompanyPermissionInAccess,
} from "@/lib/auth/access-control";
import type { AccountAccessSummary } from "@/lib/auth/account-profile";
import {
  getCompanyRoleLabel,
  getPlatformRoleLabel,
  type CompanyRole,
} from "@/lib/auth/roles";

type CompanyAccessPanelProps = {
  companyId: string;
  companyName: string;
  access: AccountAccessSummary;
  onMembershipsChanged: () => void;
};

const rolePriority: Record<CompanyRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

function roleBadgeClasses(role: CompanyRole) {
  switch (role) {
    case "owner":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "admin":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "member":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "viewer":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function platformBadgeClasses(isSuperAdmin: boolean) {
  return isSuperAdmin
    ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800"
    : "border-slate-200 bg-slate-50 text-slate-600";
}

function sortMembers(members: CompanyMember[]) {
  return [...members].sort((left, right) => {
    const leftPriority = left.isCurrentUser ? -1 : rolePriority[left.role];
    const rightPriority = right.isCurrentUser ? -1 : rolePriority[right.role];
    return leftPriority - rightPriority || left.displayName.localeCompare(right.displayName);
  });
}

export function CompanyAccessPanel({
  companyId,
  companyName,
  access,
  onMembershipsChanged,
}: Readonly<CompanyAccessPanelProps>) {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("member");
  const [savingInvite, setSavingInvite] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const actorRole = getCompanyRoleForAccess(access, companyId);
  const canReadMembers = hasCompanyPermissionInAccess(
    access,
    companyId,
    "members.read",
  );
  const canManageMembers = hasCompanyPermissionInAccess(
    access,
    companyId,
    "members.manage",
  );
  const assignableRoles = useMemo(
    () => getAssignableRolesForAccess(access, companyId),
    [access, companyId],
  );

  useEffect(() => {
    if (assignableRoles.length === 0) {
      return;
    }

    setInviteRole((current) =>
      assignableRoles.includes(current) ? current : assignableRoles[0],
    );
  }, [assignableRoles]);

  async function reloadMembers() {
    const data = await listCompanyMembers(companyId);
    setMembers(sortMembers(data));
  }

  useEffect(() => {
    if (!canReadMembers) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await listCompanyMembers(companyId);
        if (!cancelled) {
          setMembers(sortMembers(data));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CompanyMembershipClientError
              ? error.message
              : "Failed to load company members.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [canReadMembers, companyId]);

  const memberCountLabel = useMemo(() => {
    if (loading) {
      return "Loading...";
    }
    return `${members.length} member${members.length === 1 ? "" : "s"}`;
  }, [loading, members.length]);

  async function handleInvite() {
    if (!inviteEmail.trim() || !assignableRoles.includes(inviteRole)) {
      return;
    }

    setSavingInvite(true);
    setErrorMessage(null);
    try {
      await addCompanyMember({
        companyId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      await reloadMembers();
      onMembershipsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof CompanyMembershipClientError
          ? error.message
          : "Failed to add company member.",
      );
    } finally {
      setSavingInvite(false);
    }
  }

  async function handleRoleChange(member: CompanyMember, nextRole: CompanyRole) {
    if (member.role === nextRole) {
      return;
    }

    setUpdatingUserId(member.userId);
    setErrorMessage(null);
    try {
      await updateCompanyMemberRole({
        userId: member.userId,
        companyId,
        role: nextRole,
      });
      await reloadMembers();
      onMembershipsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof CompanyMembershipClientError
          ? error.message
          : "Failed to update member role.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRemove(member: CompanyMember) {
    const confirmed = window.confirm(
      `Remove ${member.displayName || member.email || member.userId} from ${companyName}?`,
    );
    if (!confirmed) {
      return;
    }

    setRemovingUserId(member.userId);
    setErrorMessage(null);
    try {
      await removeCompanyMember({
        userId: member.userId,
        companyId,
      });
      await reloadMembers();
      onMembershipsChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof CompanyMembershipClientError
          ? error.message
          : "Failed to remove company member.",
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Access
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Team and permissions
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Roles are enforced in the web BFF before CRM requests reach the internal services.
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Your access
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {actorRole ? (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClasses(actorRole)}`}
              >
                {getCompanyRoleLabel(actorRole)}
              </span>
            ) : null}
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${platformBadgeClasses(access.isSuperAdmin)}`}
            >
              {getPlatformRoleLabel(access.platformRole)}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{memberCountLabel}</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {!canReadMembers ? (
        <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Your current role does not allow you to inspect company memberships.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#ffffff)] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Team roster
            </p>

            {loading ? (
              <div className="mt-4 grid gap-3">
                <div className="h-20 animate-pulse rounded-[1.2rem] bg-slate-100" />
                <div className="h-20 animate-pulse rounded-[1.2rem] bg-slate-100" />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {members.map((member) => {
                  const canManageThisMember =
                    canManageMembers &&
                    canManageMembershipRoleInAccess(access, companyId, member.role);
                  const roleOptions = canManageThisMember
                    ? assignableRoles
                    : [member.role];

                  return (
                    <div
                      className="rounded-[1.2rem] border border-slate-200 bg-white p-4"
                      key={`${member.userId}-${member.companyId}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {member.displayName}
                            </p>
                            {member.isCurrentUser ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                You
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 break-all text-sm text-slate-600">
                            {member.email || member.userId}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Joined {new Date(member.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClasses(member.role)}`}
                          >
                            {member.roleLabel}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${platformBadgeClasses(member.isSuperAdmin)}`}
                          >
                            {getPlatformRoleLabel(member.platformRole)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label className="grid gap-1">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                            Company role
                          </span>
                          <select
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                            disabled={
                              !canManageThisMember || updatingUserId === member.userId
                            }
                            onChange={(event) =>
                              void handleRoleChange(
                                member,
                                event.target.value as CompanyRole,
                              )
                            }
                            value={member.role}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {getCompanyRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                        </label>

                        {canManageThisMember ? (
                          <button
                            className="mt-5 inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50"
                            disabled={removingUserId === member.userId}
                            onClick={() => void handleRemove(member)}
                            type="button"
                          >
                            {removingUserId === member.userId ? "Removing..." : "Remove"}
                          </button>
                        ) : (
                          <p className="mt-5 text-xs text-slate-500">
                            This membership is protected by your current role.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7,_#ffffff)] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Invite access
            </p>

            {canManageMembers ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">
                    Add an existing user to {companyName}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The teammate must already have a Lisent CRM account. Owners can assign
                    admin/member/viewer. Admins can assign member/viewer.
                  </p>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Email</span>
                      <input
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@company.com"
                        value={inviteEmail}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">Role</span>
                      <select
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                        onChange={(event) =>
                          setInviteRole(event.target.value as CompanyRole)
                        }
                        value={inviteRole}
                      >
                        {assignableRoles.map((role) => (
                          <option key={role} value={role}>
                            {getCompanyRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:opacity-50"
                      disabled={
                        savingInvite ||
                        inviteEmail.trim() === "" ||
                        !assignableRoles.includes(inviteRole)
                      }
                      onClick={() => void handleInvite()}
                      type="button"
                    >
                      {savingInvite ? "Adding..." : "Add member"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  <p className="font-semibold text-slate-800">Role guide</p>
                  <p className="mt-2">Owner: full company control, including delete company.</p>
                  <p>Admin: manages CRM data, imports, integrations, and limited member access.</p>
                  <p>Member: works on customers and daily workflows.</p>
                  <p>Viewer: read-only visibility.</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                Only owners and admins can manage team access. Your role in this company is{" "}
                {actorRole ? getCompanyRoleLabel(actorRole) : "not assigned"}.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
