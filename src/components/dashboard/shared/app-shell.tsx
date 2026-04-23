"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import { AppSidebar } from "@/components/dashboard/shared/app-sidebar";
import { AppTopbar } from "@/components/dashboard/shared/app-topbar";
import { MobileDrawer } from "@/components/dashboard/shared/mobile-drawer";
import {
  ACCOUNT_PROFILE_UPDATED_EVENT,
  getAccountProfile,
} from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { listCompanies } from "@/lib/crm/client";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";
import {
  clearStoredCompany,
  readStoredCompany,
  storeCompany,
} from "@/lib/workspace/workspace-context";

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE !== "false";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: Readonly<AppShellProps>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hydratedRef = useRef(false);

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

  // Persist selection to localStorage whenever URL carries one.
  useEffect(() => {
    if (uiOnlyMode) return;
    if (!companyId) return;
    storeCompany(companyId, companyName);
  }, [companyId, companyName]);

  // One-shot hydration: if URL has no company but localStorage does,
  // restore it silently. Validates against the user's current company
  // list — clears stale entries and auto-selects when the user only
  // has one workspace.
  useEffect(() => {
    if (uiOnlyMode) return;
    if (hydratedRef.current) return;
    if (companyId) {
      hydratedRef.current = true;
      return;
    }

    hydratedRef.current = true;
    let cancelled = false;

    async function hydrate() {
      const stored = readStoredCompany();
      try {
        const companies = await listCompanies();
        if (cancelled) return;

        let nextId = "";
        let nextName = "";

        if (stored) {
          const match = companies.find((c) => c.id === stored.id);
          if (match) {
            nextId = match.id;
            nextName = match.name;
          } else {
            clearStoredCompany();
          }
        }

        if (!nextId && companies.length === 1) {
          nextId = companies[0]!.id;
          nextName = companies[0]!.name;
        }

        if (!nextId) return;

        storeCompany(nextId, nextName);
        const params = new URLSearchParams(searchParams.toString());
        params.set("company", nextId);
        if (nextName) params.set("companyName", nextName);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      } catch {
        /* network / auth errors — stay in unselected state */
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [companyId, pathname, router, searchParams]);

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
        demoMode={uiOnlyMode}
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
