"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
            : t("home.errors.loadSnapshot");
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

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
          {t("home.snapshot.noWorkspaceSelected")}
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-tertiary)]">
          {t("home.snapshot.noWorkspaceHelp")}
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
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t("home.snapshot.eyebrow")}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-[var(--text-primary)]">
            {companyName || t("home.snapshot.activeWorkspace")}
          </p>
        </div>
        <Link
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          href={dashboardHref}
        >
          <span className="truncate">{t("home.snapshot.openFullDashboard")}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
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
            label={t("home.kpi.leads")}
            loading={loading}
            primary={String(leads.length)}
            secondary={t("home.snapshot.newCount", { count: newLeads })}
          />
          <MiniStat
            icon={<Briefcase className="h-4 w-4" aria-hidden="true" />}
            label={t("home.kpi.deals")}
            loading={loading}
            primary={String(deals.length)}
            secondary={t("home.snapshot.openCount", { count: openDeals.length })}
          />
          <MiniStat
            icon={<User className="h-4 w-4" aria-hidden="true" />}
            label={t("home.kpi.customers")}
            loading={loading}
            primary={String(customers.length)}
            secondary={t("home.snapshot.inWorkspace")}
          />
          <MiniStat
            icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
            label={t("home.snapshot.openPipeline")}
            loading={loading}
            primary={openPipelineValue || "—"}
            secondary={t("home.kpi.openPipelineHint")}
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
    <div className="min-w-0 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
        <span className="shrink-0">{icon}</span>
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        {loading ? (
          <span className="inline-block h-6 w-12 animate-pulse rounded bg-[var(--surface-inset)]" />
        ) : (
          primary
        )}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-[var(--text-tertiary)]">{secondary}</p>
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
