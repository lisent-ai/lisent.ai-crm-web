"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, Building2, Target, User } from "lucide-react";

import { ActivityChart } from "@/components/dashboard/home/activity-chart";
import { OverviewHeader } from "@/components/dashboard/home/overview-header";
import { PipelineOverview } from "@/components/dashboard/home/pipeline-overview";
import { QuickActionsPanel } from "@/components/dashboard/home/quick-actions-panel";
import { RecentLeadsList } from "@/components/dashboard/home/recent-leads-list";
import { StatCard } from "@/components/dashboard/home/stat-card";
import {
  CRMClientError,
  type Company,
  type Customer,
  type Deal,
  type Lead,
  listAllCustomers,
  listCompanies,
  listDeals,
  listLeads,
} from "@/lib/crm/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export function DashboardOverview() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [companiesRes, customersRes, leadsRes, dealsRes] = await Promise.all([
          listCompanies(),
          listAllCustomers(),
          companyId ? listLeads(companyId) : Promise.resolve<Lead[]>([]),
          companyId ? listDeals(companyId) : Promise.resolve<Deal[]>([]),
        ]);

        if (cancelled) return;
        setCompanies(companiesRes);
        setCustomers(customersRes);
        setLeads(leadsRes);
        setDeals(dealsRes);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof CRMClientError
            ? error.message
            : "Failed to load dashboard data.";
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const leadsTrend = useMemo(() => computeTrend(leads), [leads]);
  const dealsTrend = useMemo(() => computeTrend(deals), [deals]);
  const dealsValue = useMemo(() => sumDealsAmount(deals), [deals]);
  const newLeadsCount = useMemo(
    () => leads.filter((l) => l.status === "new").length,
    [leads],
  );

  const subtitle = companyId
    ? companyName
      ? `Workspace · ${companyName}`
      : "Workspace"
    : "Workspace — pick a company to see leads and deals data";

  return (
    <div className="grid gap-5">
      <OverviewHeader subtitle={subtitle} />

      {errorMessage && (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Companies"
          loading={loading}
          value={String(companies.length)}
          hint="Across workspace"
        />
        <StatCard
          icon={User}
          label="Customers"
          loading={loading}
          value={String(customers.length)}
          hint="All companies"
        />
        <StatCard
          icon={Target}
          label="Leads"
          loading={loading}
          trend={companyId ? leadsTrend : null}
          value={companyId ? String(leads.length) : "—"}
          hint={
            companyId
              ? `${newLeadsCount} new · last 7d trend`
              : "Pick a company"
          }
        />
        <StatCard
          icon={Briefcase}
          label="Deals"
          loading={loading}
          trend={companyId ? dealsTrend : null}
          value={companyId ? String(deals.length) : "—"}
          hint={
            companyId
              ? dealsValue || "No amount yet"
              : "Pick a company"
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ActivityChart
          deals={deals}
          emptyHint={
            companyId
              ? "No activity in the last 7 days yet."
              : "Pick a company to see weekly activity."
          }
          leads={leads}
        />
        <QuickActionsPanel companyId={companyId} companyName={companyName} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PipelineOverview
          deals={deals}
          emptyHint={
            companyId
              ? "No deals created yet."
              : "Pick a company to see deal pipeline."
          }
        />
        <RecentLeadsList
          companyId={companyId}
          companyName={companyName}
          emptyHint={
            companyId
              ? "No leads yet."
              : "Pick a company to see recent leads."
          }
          leads={leads}
        />
      </section>
    </div>
  );
}

function computeTrend(items: { createdAt: string }[]): number | null {
  if (items.length === 0) return null;
  const now = Date.now();
  const weekStart = now - 7 * DAY_MS;
  const prevStart = now - 14 * DAY_MS;

  let current = 0;
  let previous = 0;
  for (const item of items) {
    if (!item.createdAt) continue;
    const t = Date.parse(item.createdAt);
    if (Number.isNaN(t)) continue;
    if (t >= weekStart) current += 1;
    else if (t >= prevStart) previous += 1;
  }

  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function sumDealsAmount(deals: Deal[]): string {
  const byCurrency = new Map<string, number>();
  for (const d of deals) {
    if (!Number.isFinite(d.amount)) continue;
    const cur = (d.currency || "USD").toUpperCase();
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + d.amount);
  }
  if (byCurrency.size === 0) return "";
  const parts: string[] = [];
  for (const [currency, amount] of byCurrency) {
    try {
      parts.push(
        new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amount),
      );
    } catch {
      parts.push(`${Math.round(amount).toLocaleString()} ${currency}`);
    }
  }
  return parts.join(" · ");
}
