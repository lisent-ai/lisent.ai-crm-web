"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import { AppSidebar } from "@/components/dashboard/shared/app-sidebar";
import { AppTopbar } from "@/components/dashboard/shared/app-topbar";
import { MobileDrawer } from "@/components/dashboard/shared/mobile-drawer";
import {
  ACCOUNT_PROFILE_UPDATED_EVENT,
  getAccountProfile,
} from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE !== "false";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: Readonly<AppShellProps>) {
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!uiOnlyMode) {
    ensureFrontendSuperTokensInit();
  }

  useEffect(() => {
    if (uiOnlyMode) return;

    let cancelled = false;

    async function loadAccount() {
      try {
        const next = await getAccountProfile();
        if (!cancelled) setAccount(next);
      } catch {
        if (!cancelled) setAccount(null);
      }
    }

    function handleUpdated(event: Event) {
      const next = (event as CustomEvent<AccountProfile>).detail;
      if (!cancelled) setAccount(next);
    }

    void loadAccount();
    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, handleUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const shell = (
    <div className="flex min-h-screen bg-[var(--surface-muted)] text-[var(--text-primary)]">
      <AppSidebar companyId={companyId} companyName={companyName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          account={account}
          companyId={companyId}
          companyName={companyName}
          demoMode={uiOnlyMode}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      <MobileDrawer
        companyId={companyId}
        companyName={companyName}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      />
    </div>
  );

  if (uiOnlyMode) {
    return shell;
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)] px-4 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="h-[80vh] animate-pulse rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]" />
        </div>
      </div>
    );
  }

  return <SessionAuth>{shell}</SessionAuth>;
}
