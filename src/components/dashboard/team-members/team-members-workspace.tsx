"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, MoreHorizontal, Plus, Trash2, UserPlus } from "lucide-react";

import { AddTeamMemberModal } from "@/components/dashboard/team-members/add-team-member-modal";
import { CompanyMemberRemoveModal } from "@/components/dashboard/companies/company-member-remove-modal";
import { CompanyRoleChangeModal } from "@/components/dashboard/companies/company-role-change-modal";
import {
  addCompanyMember,
  CompanyMembershipClientError,
  listCompanyMembers,
  removeCompanyMember,
  type CompanyMember,
  updateCompanyMemberRole,
} from "@/lib/auth/company-membership-client";
import { getAccountProfile } from "@/lib/account/client";
import {
  canManageMembershipRoleInAccess,
  getAssignableRolesForAccess,
  hasCompanyPermissionInAccess,
} from "@/lib/auth/access-control";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { getCompanyRoleLabel, type CompanyRole } from "@/lib/auth/roles";

const ADMIN_ROLES: CompanyRole[] = ["owner", "admin"];

const ROLE_PRIORITY: Record<CompanyRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

const AVATAR_PALETTE = [
  "linear-gradient(135deg,_#6366f1,_#8b5cf6)",
  "linear-gradient(135deg,_#0ea5e9,_#22d3ee)",
  "linear-gradient(135deg,_#10b981,_#34d399)",
  "linear-gradient(135deg,_#f59e0b,_#fbbf24)",
  "linear-gradient(135deg,_#ec4899,_#f472b6)",
  "linear-gradient(135deg,_#ef4444,_#f87171)",
  "linear-gradient(135deg,_#8b5cf6,_#ec4899)",
  "linear-gradient(135deg,_#0891b2,_#10b981)",
];

function avatarGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]!;
}

function roleTone(role: CompanyRole): string {
  switch (role) {
    case "owner":
      return "bg-[color-mix(in_srgb,_var(--signal-amber)_18%,_var(--surface))] text-[#92400e]";
    case "admin":
      return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
    case "member":
      return "bg-[color-mix(in_srgb,_var(--signal-green)_14%,_var(--surface))] text-[#065f46]";
    case "viewer":
      return "bg-[var(--surface-inset)] text-[var(--text-secondary)]";
  }
}

type PendingRoleChange = { member: CompanyMember; nextRole: CompanyRole };
type PendingRemoval = { member: CompanyMember };

export function TeamMembersWorkspace() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [savingInvite, setSavingInvite] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const [nextAccount, nextMembers] = await Promise.all([
        getAccountProfile(),
        listCompanyMembers(companyId),
      ]);
      setAccount(nextAccount);
      setMembers(nextMembers);
    } catch (error) {
      setErrorMessage(
        error instanceof CompanyMembershipClientError
          ? error.message
          : "Failed to load team members.",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const assignableRoles = useMemo(() => {
    if (!account || !companyId) return [] as CompanyRole[];
    return getAssignableRolesForAccess(account.access, companyId);
  }, [account, companyId]);

  const canManageMembers = useMemo(() => {
    if (!account || !companyId) return false;
    return hasCompanyPermissionInAccess(account.access, companyId, "members.manage");
  }, [account, companyId]);

  const canReadMembers = useMemo(() => {
    if (!account || !companyId) return false;
    return hasCompanyPermissionInAccess(account.access, companyId, "members.read");
  }, [account, companyId]);

  const { admins, accountUsers } = useMemo(() => {
    const admins: CompanyMember[] = [];
    const accountUsers: CompanyMember[] = [];
    for (const member of members) {
      if (ADMIN_ROLES.includes(member.role)) admins.push(member);
      else accountUsers.push(member);
    }
    const sorter = (a: CompanyMember, b: CompanyMember) => {
      const aPriority = a.isCurrentUser ? -1 : ROLE_PRIORITY[a.role];
      const bPriority = b.isCurrentUser ? -1 : ROLE_PRIORITY[b.role];
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (a.displayName || a.email).localeCompare(b.displayName || b.email);
    };
    admins.sort(sorter);
    accountUsers.sort(sorter);
    return { admins, accountUsers };
  }, [members]);

  async function handleInvite(email: string, role: CompanyRole) {
    if (!companyId) return;
    setSavingInvite(true);
    setInviteError(null);
    try {
      await addCompanyMember({ companyId, email, role });
      setInviteOpen(false);
      await reload();
    } catch (error) {
      setInviteError(
        error instanceof CompanyMembershipClientError
          ? error.message
          : "Failed to add team member.",
      );
    } finally {
      setSavingInvite(false);
    }
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange || !companyId) return;
    const { member, nextRole } = pendingRoleChange;
    setUpdatingUserId(member.userId);
    try {
      await updateCompanyMemberRole({ userId: member.userId, companyId, role: nextRole });
      setPendingRoleChange(null);
      await reload();
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

  async function confirmRemove() {
    if (!pendingRemoval || !companyId) return;
    const { member } = pendingRemoval;
    setRemovingUserId(member.userId);
    try {
      await removeCompanyMember({ userId: member.userId, companyId });
      setPendingRemoval(null);
      await reload();
    } catch (error) {
      setErrorMessage(
        error instanceof CompanyMembershipClientError
          ? error.message
          : "Failed to remove team member.",
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  if (!companyId) {
    return <EmptyWorkspace />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
            Team members
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-tertiary)]">
            Manage your team members and their account permissions
            {companyName ? ` in ${companyName}.` : "."}
          </p>
        </div>
        {canManageMembers && assignableRoles.length > 0 && (
          <button
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]"
            onClick={() => setInviteOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add team member
          </button>
        )}
      </header>

      {errorMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}

      {!canReadMembers && !loading ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-secondary)]">
          Your current role does not allow you to inspect memberships for this
          workspace.
        </div>
      ) : null}

      <Section
        access={account?.access ?? null}
        assignableRoles={assignableRoles}
        canManageMembers={canManageMembers}
        companyId={companyId}
        count={admins.length}
        description="Admins can add and remove users and manage organization-level settings."
        loading={loading}
        members={admins}
        onRemove={(member) => setPendingRemoval({ member })}
        onRoleChange={(member, nextRole) =>
          setPendingRoleChange({ member, nextRole })
        }
        removingUserId={removingUserId}
        title="Admin users"
        updatingUserId={updatingUserId}
      />

      <Section
        access={account?.access ?? null}
        assignableRoles={assignableRoles}
        canManageMembers={canManageMembers}
        companyId={companyId}
        count={accountUsers.length}
        description="Account users can access leads, deals and customers for this workspace without touching organization-level settings."
        loading={loading}
        members={accountUsers}
        onRemove={(member) => setPendingRemoval({ member })}
        onRoleChange={(member, nextRole) =>
          setPendingRoleChange({ member, nextRole })
        }
        removingUserId={removingUserId}
        title="Account users"
        updatingUserId={updatingUserId}
      />

      {inviteOpen && (
        <AddTeamMemberModal
          assignableRoles={assignableRoles}
          companyName={companyName}
          errorMessage={inviteError}
          onClose={() => {
            setInviteOpen(false);
            setInviteError(null);
          }}
          onSubmit={handleInvite}
          saving={savingInvite}
        />
      )}

      {pendingRoleChange && (
        <CompanyRoleChangeModal
          currentRole={pendingRoleChange.member.role}
          memberEmail={pendingRoleChange.member.email}
          memberName={pendingRoleChange.member.displayName}
          nextRole={pendingRoleChange.nextRole}
          onClose={() => setPendingRoleChange(null)}
          onConfirm={() => void confirmRoleChange()}
          saving={updatingUserId === pendingRoleChange.member.userId}
        />
      )}

      {pendingRemoval && (
        <CompanyMemberRemoveModal
          companyName={companyName}
          memberEmail={pendingRemoval.member.email}
          memberName={pendingRemoval.member.displayName}
          onClose={() => setPendingRemoval(null)}
          onConfirm={() => void confirmRemove()}
          saving={removingUserId === pendingRemoval.member.userId}
        />
      )}
    </div>
  );
}

type SectionProps = {
  title: string;
  description: string;
  count: number;
  members: CompanyMember[];
  loading: boolean;
  canManageMembers: boolean;
  assignableRoles: readonly CompanyRole[];
  access: AccountProfile["access"] | null;
  companyId: string;
  updatingUserId: string | null;
  removingUserId: string | null;
  onRoleChange: (member: CompanyMember, nextRole: CompanyRole) => void;
  onRemove: (member: CompanyMember) => void;
};

function Section({
  title,
  description,
  count,
  members,
  loading,
  canManageMembers,
  assignableRoles,
  access,
  companyId,
  updatingUserId,
  removingUserId,
  onRoleChange,
  onRemove,
}: Readonly<SectionProps>) {
  return (
    <section className="grid gap-5 border-t border-[var(--border-subtle)] pt-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          {!loading && count > 0 && (
            <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[var(--surface-muted)] px-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
              {count}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">
          {description}
        </p>
      </div>

      <div className="min-w-0 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        {loading ? (
          <MemberSkeleton />
        ) : members.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-tertiary)]">
            No {title.toLowerCase()} yet.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    <th className="w-[44%] px-5 py-3">Name</th>
                    <th className="w-[18%] px-5 py-3">Date added</th>
                    <th className="w-[18%] px-5 py-3">Last active</th>
                    <th className="w-[14%] px-5 py-3">Role</th>
                    <th className="w-[6%] px-5 py-3 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <MemberRow
                      access={access}
                      assignableRoles={assignableRoles}
                      canManageMembers={canManageMembers}
                      companyId={companyId}
                      key={`${member.userId}-${member.companyId}`}
                      member={member}
                      onRemove={onRemove}
                      onRoleChange={onRoleChange}
                      removingUserId={removingUserId}
                      updatingUserId={updatingUserId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col divide-y divide-[var(--border-subtle)] md:hidden">
              {members.map((member) => (
                <MemberCard
                  access={access}
                  assignableRoles={assignableRoles}
                  canManageMembers={canManageMembers}
                  companyId={companyId}
                  key={`${member.userId}-${member.companyId}-card`}
                  member={member}
                  onRemove={onRemove}
                  onRoleChange={onRoleChange}
                  removingUserId={removingUserId}
                  updatingUserId={updatingUserId}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

type MemberRowCommonProps = {
  member: CompanyMember;
  canManageMembers: boolean;
  assignableRoles: readonly CompanyRole[];
  access: AccountProfile["access"] | null;
  companyId: string;
  updatingUserId: string | null;
  removingUserId: string | null;
  onRoleChange: (member: CompanyMember, nextRole: CompanyRole) => void;
  onRemove: (member: CompanyMember) => void;
};

function MemberRow({
  member,
  canManageMembers,
  assignableRoles,
  access,
  companyId,
  updatingUserId,
  removingUserId,
  onRoleChange,
  onRemove,
}: Readonly<MemberRowCommonProps>) {
  const canManageThis =
    canManageMembers &&
    access !== null &&
    canManageMembershipRoleInAccess(access, companyId, member.role);
  const roleOptions = canManageThis ? assignableRoles : [member.role];
  const isUpdating = updatingUserId === member.userId;
  const isRemoving = removingUserId === member.userId;

  return (
    <tr className="border-b border-[var(--border-subtle)] transition last:border-b-0 hover:bg-[var(--surface-subtle)]">
      <td className="px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.displayName || member.email} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-medium text-[var(--text-primary)]">
              <span className="truncate">{member.displayName || "Unnamed"}</span>
              {member.isCurrentUser && (
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  You
                </span>
              )}
            </p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">
              {member.email || member.userId}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
        {formatDate(member.createdAt)}
      </td>
      <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
        {formatDate(member.updatedAt)}
      </td>
      <td className="px-5 py-3.5">
        <RoleControl
          canManage={canManageThis}
          isUpdating={isUpdating}
          onChange={(next) => onRoleChange(member, next)}
          options={roleOptions}
          value={member.role}
        />
      </td>
      <td className="px-5 py-3.5">
        <div className="flex justify-end">
          <button
            aria-label={`Remove ${member.displayName || member.email}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))] hover:text-[var(--signal-red)] disabled:pointer-events-none disabled:opacity-30"
            disabled={!canManageThis || isRemoving}
            onClick={() => onRemove(member)}
            title={canManageThis ? "Remove member" : "You can't remove this member"}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

type RoleControlProps = {
  value: CompanyRole;
  options: readonly CompanyRole[];
  canManage: boolean;
  isUpdating: boolean;
  onChange: (next: CompanyRole) => void;
};

function RoleControl({
  value,
  options,
  canManage,
  isUpdating,
  onChange,
}: Readonly<RoleControlProps>) {
  if (!canManage || options.length <= 1) {
    return (
      <span
        className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${roleTone(value)}`}
      >
        {getCompanyRoleLabel(value)}
      </span>
    );
  }
  return (
    <div className="relative inline-block">
      <select
        className={`appearance-none rounded-full pl-3 pr-7 py-1 text-xs font-medium outline-none transition focus:ring-2 focus:ring-[var(--accent-soft)] disabled:opacity-60 ${roleTone(value)}`}
        disabled={isUpdating}
        onChange={(event) => onChange(event.target.value as CompanyRole)}
        value={value}
      >
        {options.map((r) => (
          <option key={r} value={r}>
            {getCompanyRoleLabel(r)}
          </option>
        ))}
      </select>
      <MoreHorizontal
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50"
      />
    </div>
  );
}

function MemberCard({
  member,
  canManageMembers,
  assignableRoles,
  access,
  companyId,
  updatingUserId,
  removingUserId,
  onRoleChange,
  onRemove,
}: Readonly<MemberRowCommonProps>) {
  const canManageThis =
    canManageMembers &&
    access !== null &&
    canManageMembershipRoleInAccess(access, companyId, member.role);
  const roleOptions = canManageThis ? assignableRoles : [member.role];
  const isUpdating = updatingUserId === member.userId;
  const isRemoving = removingUserId === member.userId;

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <Avatar name={member.displayName || member.email} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-[var(--text-primary)]">
            <span className="truncate">{member.displayName || "Unnamed"}</span>
            {member.isCurrentUser && (
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                You
              </span>
            )}
          </p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            {member.email || member.userId}
          </p>
        </div>
        <button
          aria-label="Remove member"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))] hover:text-[var(--signal-red)] disabled:opacity-40"
          disabled={!canManageThis || isRemoving}
          onClick={() => onRemove(member)}
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-tertiary)]">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide">
            Date added
          </p>
          <p className="mt-0.5 text-[var(--text-secondary)]">
            {formatDate(member.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide">
            Last active
          </p>
          <p className="mt-0.5 text-[var(--text-secondary)]">
            {formatDate(member.updatedAt)}
          </p>
        </div>
      </div>

      <div>
        <RoleControl
          canManage={canManageThis}
          isUpdating={isUpdating}
          onChange={(next) => onRoleChange(member, next)}
          options={roleOptions}
          value={member.role}
        />
      </div>
    </div>
  );
}

function Avatar({ name }: Readonly<{ name: string }>) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? parts[0]!.slice(0, 2).toUpperCase()
        : (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  const gradient = avatarGradient(name || "anon");
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-[var(--shadow-xs)]"
      style={{ backgroundImage: gradient }}
    >
      {initials}
    </span>
  );
}

function MemberSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          className="h-12 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-inset)]"
          key={i}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function EmptyWorkspace() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          Team members
        </h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Manage your team members and their account permissions here.
        </p>
      </header>
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-6 py-12 text-center shadow-[var(--shadow-card)]">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        >
          <UserPlus className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            No workspace selected
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-tertiary)]">
            Pick a workspace from the switcher in the top bar to manage its team
            members here.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          href="/dashboard/companies?create=1"
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Create workspace
        </Link>
      </div>
    </div>
  );
}
