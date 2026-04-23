"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, Building2, Target, User } from "lucide-react";

import { requestCreateWorkspace } from "@/components/dashboard/shared/create-workspace-modal";

import { ActivityChart } from "@/components/dashboard/home/activity-chart";
import { OverviewHeader } from "@/components/dashboard/home/overview-header";
import { PipelineOverview } from "@/components/dashboard/home/pipeline-overview";
import { QuickActionsPanel } from "@/components/dashboard/home/quick-actions-panel";
import { RecentLeadsList } from "@/components/dashboard/home/recent-leads-list";
import { StatCard } from "@/components/dashboard/home/stat-card";
import {
  CRMClientError,
  type Customer,
  type Deal,
  type Lead,
  listCustomers,
  listDeals,
  listLeads,
} from "@/lib/crm/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export function CompanyDashboard() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLeads([]);
      setDeals([]);
      setCustomers([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [leadsRes, dealsRes, customersRes] = await Promise.all([
          listLeads(companyId),
          listDeals(companyId),
          listCustomers(companyId),
        ]);
        if (cancelled) return;
        setLeads(leadsRes);
        setDeals(dealsRes);
        setCustomers(customersRes);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof CRMClientError
            ? error.message
            : "Failed to load workspace dashboard.";
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

  const newLeadsCount = useMemo(
    () => leads.filter((l) => l.status === "new").length,
    [leads],
  );
  const leadsTrend = useMemo(() => computeTrend(leads), [leads]);
  const dealsTrend = useMemo(() => computeTrend(deals), [deals]);
  const dealsAmount = useMemo(() => sumDealsAmount(deals), [deals]);
  const openPipelineValue = useMemo(() => sumOpenPipelineAmount(deals), [deals]);

  if (!companyId) {
    return <EmptyCompanyDashboard />;
  }

  const subtitle = companyName
    ? `Workspace · ${companyName}`
    : "Workspace — company selected";

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
          icon={Target}
          label="Leads"
          loading={loading}
          trend={leadsTrend}
          value={String(leads.length)}
          hint={`${newLeadsCount} new · last 7d trend`}
        />
        <StatCard
          icon={Briefcase}
          label="Deals"
          loading={loading}
          trend={dealsTrend}
          value={String(deals.length)}
          hint={dealsAmount || "No amount yet"}
        />
        <StatCard
          icon={User}
          label="Customers in workspace"
          loading={loading}
          value={String(customers.length)}
          hint="This workspace"
        />
        <StatCard
          icon={Building2}
          label="Open pipeline value"
          loading={loading}
          value={openPipelineValue || "—"}
          hint="Excluding won & lost"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ActivityChart
          deals={deals}
          emptyHint="No activity in the last 7 days yet."
          leads={leads}
        />
        <QuickActionsPanel companyId={companyId} companyName={companyName} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PipelineOverview
          deals={deals}
          emptyHint="No deals created yet."
        />
        <RecentLeadsList
          companyId={companyId}
          companyName={companyName}
          emptyHint="No leads yet."
          leads={leads}
        />
      </section>
    </div>
  );
}

function EmptyCompanyDashboard() {
  return (
    <div className="grid gap-5">
      <OverviewHeader subtitle="Pick a workspace to open its dashboard" />
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-6 py-12 text-center shadow-[var(--shadow-card)]">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        >
          <Building2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-[var(--text-primary)]">
            No workspace selected
          </p>
          <p className="mt-1 max-w-md text-sm text-[var(--text-tertiary)]">
            Use the workspace switcher in the top bar or pick one from the
            Overview to see leads, deals and pipeline for that workspace.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            className="inline-flex items-center rounded-full bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            href="/dashboard"
          >
            Go to Overview
          </Link>
          <button
            className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            onClick={requestCreateWorkspace}
            type="button"
          >
            Create workspace
          </button>
        </div>
      </div>
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
  return formatCurrencyMap(byCurrency);
}

function sumOpenPipelineAmount(deals: Deal[]): string {
  const byCurrency = new Map<string, number>();
  for (const d of deals) {
    if (d.stage === "won" || d.stage === "lost") continue;
    if (!Number.isFinite(d.amount)) continue;
    const cur = (d.currency || "USD").toUpperCase();
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + d.amount);
  }
  return formatCurrencyMap(byCurrency);
}

function formatCurrencyMap(map: Map<string, number>): string {
  if (map.size === 0) return "";
  const parts: string[] = [];
  for (const [currency, amount] of map) {
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
