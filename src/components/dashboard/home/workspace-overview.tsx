"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, CheckCheck, User } from "lucide-react";

import { OverviewHeader } from "@/components/dashboard/home/overview-header";
import { QuickActionsPanel } from "@/components/dashboard/home/quick-actions-panel";
import { StatCard } from "@/components/dashboard/home/stat-card";
import { TodayCalls } from "@/components/dashboard/home/today-calls";
import { WorkspaceSnapshot } from "@/components/dashboard/home/workspace-snapshot";
import {
  CRMClientError,
  type Company,
  type Customer,
  listAllCustomers,
  listCompanies,
} from "@/lib/crm/client";

export function WorkspaceOverview() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const activeCompanyId = searchParams.get("company")?.trim() ?? "";
  const activeCompanyName = searchParams.get("companyName")?.trim() ?? "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [companiesRes, customersRes] = await Promise.all([
          listCompanies(),
          listAllCustomers(),
        ]);
        if (cancelled) return;
        setCompanies(companiesRes);
        setCustomers(customersRes);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof CRMClientError
            ? error.message
            : t("home.errors.loadWorkspaces");
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const activeLabel = activeCompanyName || t("home.workspaceOverview.noneSelected");

  return (
    <div className="grid gap-5">
      <OverviewHeader subtitle={t("home.workspaceOverview.subtitle")} />

      {errorMessage && (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Building2}
          label={t("home.workspaceOverview.workspaces")}
          loading={loading}
          value={String(companies.length)}
          hint={
            companies.length === 1
              ? t("home.workspaceOverview.singleWorkspace")
              : t("home.workspaceOverview.acrossAccount")
          }
        />
        <StatCard
          icon={User}
          label={t("home.workspaceOverview.customers")}
          loading={loading}
          value={String(customers.length)}
          hint={t("home.workspaceOverview.allCombined")}
        />
        <StatCard
          icon={CheckCheck}
          label={t("home.workspaceOverview.activeWorkspace")}
          loading={loading}
          value={activeLabel}
          hint={
            activeCompanyId
              ? t("home.workspaceOverview.scopedViews")
              : t("home.workspaceOverview.pickToActivate")
          }
        />
      </section>

      <TodayCalls companyId={activeCompanyId} companyName={activeCompanyName} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <WorkspaceSnapshot
          companyId={activeCompanyId}
          companyName={activeCompanyName}
        />
        <QuickActionsPanel
          companyId={activeCompanyId}
          companyName={activeCompanyName}
        />
      </section>
    </div>
  );
}
