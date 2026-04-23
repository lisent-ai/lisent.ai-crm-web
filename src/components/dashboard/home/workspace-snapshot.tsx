"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Briefcase, Target, User, Wallet } from "lucide-react";

import {
  CRMClientError,
  type Customer,
  type Deal,
  type Lead,
  listCustomers,
  listDeals,
  listLeads,
} from "@/lib/crm/client";

type WorkspaceSnapshotProps = {
  companyId: string;
  companyName: string;
};

export function WorkspaceSnapshot({
  companyId,
  companyName,
}: Readonly<WorkspaceSnapshotProps>) {
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
      setErrorMessage(null);
      setLoading(false);
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
            : "Failed to load workspace snapshot.";
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

  const newLeads = useMemo(
    () => leads.filter((l) => l.status === "new").length,
    [leads],
  );
  const openDeals = useMemo(
    () => deals.filter((d) => d.stage !== "won" && d.stage !== "lost"),
    [deals],
  );
  const openPipelineValue = useMemo(() => formatCurrencyTotal(openDeals), [openDeals]);

  if (!companyId) {
    return (
      <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          No workspace selected
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-tertiary)]">
          Use the workspace switcher in the top bar to select one and see a
          snapshot here.
        </p>
      </div>
    );
  }

  const dashboardHref = `/dashboard/workspace?company=${encodeURIComponent(
    companyId,
  )}${companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""}`;

  return (
    <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Workspace snapshot
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-[var(--text-primary)]">
            {companyName || "Active workspace"}
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          href={dashboardHref}
        >
          Open full dashboard
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            icon={<Target className="h-4 w-4" aria-hidden="true" />}
            label="Leads"
            loading={loading}
            primary={String(leads.length)}
            secondary={`${newLeads} new`}
          />
          <MiniStat
            icon={<Briefcase className="h-4 w-4" aria-hidden="true" />}
            label="Deals"
            loading={loading}
            primary={String(deals.length)}
            secondary={`${openDeals.length} open`}
          />
          <MiniStat
            icon={<User className="h-4 w-4" aria-hidden="true" />}
            label="Customers"
            loading={loading}
            primary={String(customers.length)}
            secondary="In workspace"
          />
          <MiniStat
            icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
            label="Open pipeline"
            loading={loading}
            primary={openPipelineValue || "—"}
            secondary="Excluding won & lost"
          />
        </div>
      )}
    </section>
  );
}

function MiniStat({
  icon,
  label,
  primary,
  secondary,
  loading,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  loading: boolean;
}>) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        {loading ? (
          <span className="inline-block h-6 w-12 animate-pulse rounded bg-[var(--surface-inset)]" />
        ) : (
          primary
        )}
      </p>
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">{secondary}</p>
    </div>
  );
}

function formatCurrencyTotal(deals: Deal[]): string {
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
