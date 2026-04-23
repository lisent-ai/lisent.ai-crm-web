"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, CheckCheck, User } from "lucide-react";

import { OverviewHeader } from "@/components/dashboard/home/overview-header";
import { QuickActionsPanel } from "@/components/dashboard/home/quick-actions-panel";
import { StatCard } from "@/components/dashboard/home/stat-card";
import { WorkspacesGrid } from "@/components/dashboard/home/workspaces-grid";
import {
  CRMClientError,
  type Company,
  type Customer,
  listAllCustomers,
  listCompanies,
} from "@/lib/crm/client";

export function WorkspaceOverview() {
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
            : "Failed to load workspaces.";
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const customerCountByCompany = useMemo(() => {
    const map = new Map<string, number>();
    for (const customer of customers) {
      if (!customer.companyId) continue;
      map.set(customer.companyId, (map.get(customer.companyId) ?? 0) + 1);
    }
    return map;
  }, [customers]);

  const activeLabel = activeCompanyName || "None selected";

  return (
    <div className="grid gap-5">
      <OverviewHeader subtitle="Your workspaces at a glance" />

      {errorMessage && (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Workspaces"
          loading={loading}
          value={String(companies.length)}
          hint={companies.length === 1 ? "Single workspace" : "Across account"}
        />
        <StatCard
          icon={User}
          label="Customers"
          loading={loading}
          value={String(customers.length)}
          hint="All workspaces combined"
        />
        <StatCard
          icon={CheckCheck}
          label="Active workspace"
          loading={loading}
          value={activeLabel}
          hint={
            activeCompanyId
              ? "Selected for scoped views"
              : "Pick a workspace to activate"
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Your workspaces
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Click a workspace to open its dashboard
              </p>
            </div>
          </div>
          <WorkspacesGrid
            activeCompanyId={activeCompanyId}
            companies={companies}
            customerCountByCompany={customerCountByCompany}
            loading={loading}
          />
        </div>

        <QuickActionsPanel
          companyId={activeCompanyId}
          companyName={activeCompanyName}
        />
      </section>
    </div>
  );
}
