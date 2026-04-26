import type { LucideProps } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  icon?: ComponentType<LucideProps>;
  loading?: boolean;
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  loading,
}: Readonly<StatCardProps>) {
  const hasTrend = typeof trend === "number" && !Number.isNaN(trend);
  const positive = hasTrend && trend! >= 0;
  const trendColor = hasTrend
    ? positive
      ? "text-[var(--signal-green)]"
      : "text-[var(--signal-red)]"
    : "";

  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-tertiary)]">
          {label}
        </p>
        {Icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-[var(--surface-inset)]" /> : value}
        </p>
        {hasTrend && !loading ? (
          <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
            {positive ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {positive ? "+" : ""}
            {trend!.toFixed(0)}%
          </span>
        ) : null}
      </div>

      {hint ? (
        <p className="mt-2 line-clamp-2 text-xs text-[var(--text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  );
}
