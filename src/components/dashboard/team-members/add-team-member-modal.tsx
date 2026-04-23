"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { getCompanyRoleLabel, type CompanyRole } from "@/lib/auth/roles";

type AddTeamMemberModalProps = {
  companyName: string;
  assignableRoles: readonly CompanyRole[];
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (email: string, role: CompanyRole) => void;
  onClose: () => void;
};

export function AddTeamMemberModal({
  companyName,
  assignableRoles,
  saving,
  errorMessage,
  onSubmit,
  onClose,
}: Readonly<AddTeamMemberModalProps>) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>(
    assignableRoles.find((r) => r !== "owner") ?? assignableRoles[0] ?? "member",
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !assignableRoles.includes(role)) return;
    onSubmit(email.trim(), role);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,15,25,0.45)] px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Add team member
            </h2>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Invite someone to {companyName || "this workspace"} by email.
            </p>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Email address
            </span>
            <input
              autoFocus
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Role
            </span>
            <select
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]"
              onChange={(e) => setRole(e.target.value as CompanyRole)}
              value={role}
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {getCompanyRoleLabel(r)}
                </option>
              ))}
            </select>
          </label>

          {errorMessage && (
            <p className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-2 text-sm text-[var(--signal-red)]">
              {errorMessage}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              className="inline-flex h-9 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={saving || !email.trim() || assignableRoles.length === 0}
              type="submit"
            >
              {saving ? "Sending…" : "Add member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
