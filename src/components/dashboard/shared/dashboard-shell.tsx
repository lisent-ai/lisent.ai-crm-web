"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import {
  ACCOUNT_PROFILE_UPDATED_EVENT,
  getAccountProfile,
} from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { getCompanyMembershipSummary } from "@/lib/auth/access-control";
import { getCompanyRoleLabel, getPlatformRoleLabel } from "@/lib/auth/roles";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/companies", label: "Companies" },
  { href: "/dashboard/access", label: "Team Access" },
  { href: "/dashboard/imports", label: "Customer Import" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/customers", label: "Customers" },
];

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE !== "false";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const shellWidthClass = "max-w-[1760px]";
  const gridClass = "xl:grid-cols-[260px_minmax(0,1fr)]";

  if (!uiOnlyMode) {
    ensureFrontendSuperTokensInit();
  }

  useEffect(() => {
    if (uiOnlyMode) {
      return;
    }

    let cancelled = false;

    async function loadAccount() {
      try {
        const nextAccount = await getAccountProfile();
        if (!cancelled) {
          setAccount(nextAccount);
        }
      } catch {
        if (!cancelled) {
          setAccount(null);
        }
      }
    }

    function handleAccountUpdated(event: Event) {
      const nextAccount = (event as CustomEvent<AccountProfile>).detail;
      if (!cancelled) {
        setAccount(nextAccount);
      }
    }

    void loadAccount();
    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, handleAccountUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(
        ACCOUNT_PROFILE_UPDATED_EVENT,
        handleAccountUpdated,
      );
    };
  }, []);

  const selectedCompanyId = searchParams.get("company")?.trim() ?? "";
  const selectedCompanyName = searchParams.get("companyName")?.trim() ?? "";
  const selectedMembership =
    account && selectedCompanyId
      ? getCompanyMembershipSummary(account.access, selectedCompanyId)
      : null;

  function buildNavHref(baseHref: string) {
    if (
      (baseHref === "/dashboard/companies" ||
        baseHref === "/dashboard/access" ||
        baseHref === "/dashboard/leads" ||
        baseHref === "/dashboard/customers" ||
        baseHref === "/dashboard/imports") &&
      selectedCompanyId
    ) {
      const nextSearch = new URLSearchParams({
        company: selectedCompanyId,
      });
      if (selectedCompanyName) {
        nextSearch.set("companyName", selectedCompanyName);
      }
      return `${baseHref}?${nextSearch.toString()}`;
    }

    return baseHref;
  }

  const shell = (
    <main className="min-h-screen overflow-hidden bg-slate-100 px-4 py-4 text-slate-900 md:px-6 md:py-6">
      <div className={`mx-auto grid gap-4 ${shellWidthClass} ${gridClass}`}>
        <aside className="rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,_#0f172a,_#111827,_#0f172a)] p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.28)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-200/70">
              Lisent.ai
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              CRM Workspace
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              A sidebar-driven product shell inspired by enterprise CRMs.
            </p>
          </div>

          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const href = buildNavHref(item.href);

              return (
                <Link
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-slate-950 shadow-[0_12px_24px_rgba(255,255,255,0.08)]"
                      : "text-slate-300 hover:bg-white/6 hover:text-white"
                  }`}
                  href={href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/72">
              Workflow
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Companies are the gateway. Imports and customer records are
              company-scoped pages.
            </p>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/72">
              Account
            </p>
            <p className="mt-3 text-sm font-semibold text-white">
              {uiOnlyMode ? "Demo user" : account?.displayName ?? "Loading profile..."}
            </p>
            <p className="mt-1 break-all text-sm text-slate-300">
              {uiOnlyMode
                ? "demo-user@lisent.ai"
                : account?.email ?? "Profile details unavailable"}
            </p>
            {!uiOnlyMode && account ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50/90">
                  {getPlatformRoleLabel(account.access.platformRole)}
                </span>
                {selectedMembership ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50/90">
                    {getCompanyRoleLabel(selectedMembership.role)}
                    {selectedCompanyName ? ` · ${selectedCompanyName}` : ""}
                  </span>
                ) : null}
              </div>
            ) : null}
            <Link
              className="mt-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
              href="/dashboard/account"
            >
              Open settings
            </Link>
          </div>
        </aside>

        <div className="min-h-[calc(100vh-3rem)] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-6">
          {children}
        </div>
      </div>
    </main>
  );

  if (uiOnlyMode) {
    return shell;
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-4 md:px-6 md:py-6">
        <div className={`mx-auto ${shellWidthClass}`}>
          <div className="h-[80vh] animate-pulse rounded-[2rem] border border-slate-200 bg-white" />
        </div>
      </main>
    );
  }

  return <SessionAuth>{shell}</SessionAuth>;
}
