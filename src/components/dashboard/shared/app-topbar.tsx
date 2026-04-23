"use client";

import Link from "next/link";
import { Bell, Menu, Upload } from "lucide-react";

import { AppTabs } from "@/components/dashboard/shared/app-tabs";
import { SearchCommand } from "@/components/dashboard/shared/search-command";
import { UserMenu } from "@/components/dashboard/shared/user-menu";
import type { AccountProfile } from "@/lib/auth/account-profile";

type AppTopbarProps = {
  account: AccountProfile | null;
  companyId: string;
  companyName: string;
  demoMode: boolean;
  onOpenDrawer: () => void;
};

export function AppTopbar({
  account,
  companyId,
  companyName,
  demoMode,
  onOpenDrawer,
}: Readonly<AppTopbarProps>) {
  const importHref = companyId
    ? `/dashboard/imports?company=${encodeURIComponent(companyId)}${
        companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""
      }`
    : "/dashboard/imports";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,_var(--surface)_90%,_transparent)] backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 md:gap-6 md:px-6">
        <button
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] md:hidden"
          onClick={onOpenDrawer}
          type="button"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <Link
          aria-label="Lisent CRM home"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#f97316,_#ef4444)] text-xs font-semibold text-white shadow-[var(--shadow-sm)] md:hidden"
          href="/dashboard"
        >
          L
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          <AppTabs companyId={companyId} companyName={companyName} />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
          <div className="hidden md:block">
            <SearchCommand />
          </div>

          <Link
            className="hidden h-9 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-white transition hover:opacity-90 md:inline-flex"
            href={importHref}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import
          </Link>

          <button
            aria-label="Notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            type="button"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--signal-red)]"
            />
          </button>

          <UserMenu
            account={account}
            companyId={companyId}
            companyName={companyName}
            demoMode={demoMode}
          />
        </div>
      </div>
    </header>
  );
}
