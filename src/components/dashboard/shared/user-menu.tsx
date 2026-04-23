"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { signOut } from "supertokens-auth-react/recipe/session";

import type { AccountProfile } from "@/lib/auth/account-profile";
import { getCompanyMembershipSummary } from "@/lib/auth/access-control";
import { getCompanyRoleLabel, getPlatformRoleLabel } from "@/lib/auth/roles";

type UserMenuProps = {
  account: AccountProfile | null;
  companyId: string;
  companyName: string;
  demoMode: boolean;
};

export function UserMenu({
  account,
  companyId,
  companyName,
  demoMode,
}: Readonly<UserMenuProps>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = demoMode
    ? "Demo user"
    : account?.displayName ?? "Workspace user";
  const email = demoMode
    ? "demo-user@lisent.ai"
    : account?.email ?? "—";
  const initials = buildInitials(displayName);

  const membership =
    !demoMode && account && companyId
      ? getCompanyMembershipSummary(account.access, companyId)
      : null;
  const platformLabel =
    !demoMode && account ? getPlatformRoleLabel(account.access.platformRole) : null;

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/auth/sign-in");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="inline-flex items-center gap-2 rounded-full p-1 pr-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] text-xs font-semibold text-white"
        >
          {initials}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2 shadow-[var(--shadow-float)]"
          role="menu"
        >
          <div className="px-3 py-3">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
              {email}
            </p>

            {(platformLabel || membership) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {platformLabel && (
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                    {platformLabel}
                  </span>
                )}
                {membership && (
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent-strong)]">
                    {getCompanyRoleLabel(membership.role)}
                    {companyName ? ` · ${companyName}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          <Link
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            href="/dashboard/account"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Account settings
          </Link>

          {!demoMode && (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--signal-red)] transition hover:bg-[var(--surface-muted)]"
              onClick={() => void handleSignOut()}
              role="menuitem"
              type="button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
