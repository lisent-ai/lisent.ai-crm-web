import { useMemo } from "react";
import {
  Briefcase,
  MessageSquare,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

import type { Lead } from "@/lib/crm/client";

import { LeadSparkline } from "./lead-sparkline";
import { computeLeadTrend, groupByDay } from "./lead-utils";

type LeadKpiStripProps = {
  leads: Lead[];
  loading?: boolean;
};

const DAYS = 7;

type KpiCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  trend: number | null;
  spark: number[];
  icon: ComponentType<LucideProps>;
};

export function LeadKpiStrip({ leads, loading }: Readonly<LeadKpiStripProps>) {
  const cards = useMemo<KpiCard[]>(() => {
    const qualified = leads.filter((l) => l.status === "qualified");
    const contacted = leads.filter((l) => l.status === "contacted");
    const converted = leads.filter((l) => l.status === "converted");

    const total = leads.length;
    const convRate = total > 0 ? (converted.length / total) * 100 : 0;

    return [
      {
        key: "total",
        label: "Total leads",
        value: new Intl.NumberFormat().format(total),
        hint: "All pipelines",
        trend: computeLeadTrend(leads),
        spark: groupByDay(leads, (l) => l.createdAt, DAYS),
        icon: Users,
      },
      {
        key: "qualified",
        label: "Qualified",
        value: new Intl.NumberFormat().format(qualified.length),
        hint: "Ready to progress",
        trend: computeLeadTrend(qualified),
        spark: groupByDay(qualified, (l) => l.updatedAt || l.createdAt, DAYS),
        icon: Target,
      },
      {
        key: "contacted",
        label: "In conversation",
        value: new Intl.NumberFormat().format(contacted.length),
        hint: "Currently active",
        trend: computeLeadTrend(contacted),
        spark: groupByDay(contacted, (l) => l.updatedAt || l.createdAt, DAYS),
        icon: MessageSquare,
      },
      {
        key: "conv",
        label: "Conversion rate",
        value: `${convRate.toFixed(1)}%`,
        hint: `${converted.length} of ${total}`,
        trend: computeLeadTrend(converted),
        spark: groupByDay(converted, (l) => l.updatedAt || l.createdAt, DAYS),
        icon: Briefcase,
      },
    ];
  }, [leads]);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <KpiCardView card={card} key={card.key} loading={loading} />
      ))}
    </section>
  );
}

function KpiCardView({ card, loading }: Readonly<{ card: KpiCard; loading?: boolean }>) {
  const Icon = card.icon;
  const hasTrend = typeof card.trend === "number" && !Number.isNaN(card.trend);
  const positive = hasTrend && card.trend! >= 0;
  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        {hasTrend ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              positive
                ? "bg-[color-mix(in_srgb,_var(--signal-green)_14%,_var(--surface))] text-[#065f46]"
                : "bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] text-[#b91c1c]"
            }`}
          >
            {positive ? (
              <TrendingUp aria-hidden="true" className="h-3 w-3" />
            ) : (
              <TrendingDown aria-hidden="true" className="h-3 w-3" />
            )}
            {positive ? "+" : ""}
            {card.trend!.toFixed(0)}%
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xs font-medium text-[var(--text-tertiary)]">{card.label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {loading ? (
            <span className="inline-block h-6 w-14 animate-pulse rounded bg-[var(--surface-inset)]" />
          ) : (
            card.value
          )}
        </p>
        <LeadSparkline values={card.spark} />
      </div>
      <p className="mt-1 truncate text-[11px] text-[var(--text-tertiary)]">{card.hint}</p>
    </div>
  );
}
