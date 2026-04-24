"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Upload } from "lucide-react";

import { NotificationCenter } from "@/components/dashboard/shared/notification-center";
import { AppTabs } from "@/components/dashboard/shared/app-tabs";
import { SearchCommand } from "@/components/dashboard/shared/search-command";
import { UserMenu } from "@/components/dashboard/shared/user-menu";
import { WorkspaceSwitcher } from "@/components/dashboard/shared/workspace-switcher";
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
      <div className="px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 md:gap-6">
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
            className="flex shrink-0 items-center md:hidden"
            href="/dashboard"
          >
            <Image
              alt="Lisent"
              className="h-auto w-14 sm:w-16"
              height={34}
              priority
              src="/lisent-logo.png"
              width={60}
            />
          </Link>

          <div className="hidden shrink-0 md:block">
            <WorkspaceSwitcher
              companyId={companyId}
              companyName={companyName}
              demoMode={demoMode}
            />
          </div>

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

            <NotificationCenter
              account={account}
              companyId={companyId}
              companyName={companyName}
              demoMode={demoMode}
            />

            <UserMenu
              account={account}
              companyId={companyId}
              companyName={companyName}
              demoMode={demoMode}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:hidden">
          <WorkspaceSwitcher
            companyId={companyId}
            companyName={companyName}
            demoMode={demoMode}
            variant="block"
          />

          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchCommand />
            </div>

            <Link
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-white transition hover:opacity-90"
              href={importHref}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import
            </Link>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-1">
            <AppTabs companyId={companyId} companyName={companyName} />
          </div>
        </div>
      </div>
    </header>
  );
}
