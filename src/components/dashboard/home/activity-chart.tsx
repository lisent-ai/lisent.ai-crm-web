"use client";

import { useMemo } from "react";

type ActivityDatum = {
  createdAt: string;
};

type ActivityChartProps = {
  leads: ActivityDatum[];
  deals: ActivityDatum[];
  emptyHint?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function ActivityChart({
  leads,
  deals,
  emptyHint = "Pick a company to see weekly activity.",
}: Readonly<ActivityChartProps>) {
  const { days, leadSeries, dealSeries, max } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets: { label: string; dateKey: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      const dateKey = d.toISOString().slice(0, 10);
      buckets.push({ label, dateKey });
    }

    const leadCounts = new Map<string, number>();
    const dealCounts = new Map<string, number>();
    for (const l of leads) {
      const key = l.createdAt?.slice(0, 10);
      if (!key) continue;
      leadCounts.set(key, (leadCounts.get(key) ?? 0) + 1);
    }
    for (const d of deals) {
      const key = d.createdAt?.slice(0, 10);
      if (!key) continue;
      dealCounts.set(key, (dealCounts.get(key) ?? 0) + 1);
    }

    const leadSeries = buckets.map((b) => leadCounts.get(b.dateKey) ?? 0);
    const dealSeries = buckets.map((b) => dealCounts.get(b.dateKey) ?? 0);
    const max = Math.max(1, ...leadSeries, ...dealSeries);

    return { days: buckets.map((b) => b.label), leadSeries, dealSeries, max };
  }, [leads, deals]);

  const hasData = leadSeries.some((v) => v > 0) || dealSeries.some((v) => v > 0);

  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Weekly activity
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            New leads and deals over the last 7 days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-tertiary)]">
          <LegendDot color="var(--accent)" label="Leads" />
          <LegendDot color="var(--signal-amber)" label="Deals" />
        </div>
      </div>

      {hasData ? (
        <div className="mt-5">
          <svg
            aria-label="Weekly lead and deal activity"
            className="h-[220px] w-full"
            role="img"
            viewBox="0 0 700 260"
            xmlns="http://www.w3.org/2000/svg"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line
                key={t}
                stroke="var(--border-subtle)"
                strokeDasharray="2,4"
                x1="40"
                x2="690"
                y1={20 + t * 180}
                y2={20 + t * 180}
              />
            ))}
            {days.map((label, i) => {
              const groupWidth = 650 / days.length;
              const groupX = 40 + i * groupWidth;
              const barWidth = Math.min(18, groupWidth / 3);
              const leadH = (leadSeries[i]! / max) * 180;
              const dealH = (dealSeries[i]! / max) * 180;
              const leadX = groupX + groupWidth / 2 - barWidth - 2;
              const dealX = groupX + groupWidth / 2 + 2;
              return (
                <g key={label}>
                  <rect
                    fill="var(--accent)"
                    height={leadH}
                    rx="4"
                    width={barWidth}
                    x={leadX}
                    y={200 - leadH}
                  />
                  <rect
                    fill="var(--signal-amber)"
                    height={dealH}
                    rx="4"
                    width={barWidth}
                    x={dealX}
                    y={200 - dealH}
                  />
                  <text
                    fill="var(--text-tertiary)"
                    fontSize="11"
                    textAnchor="middle"
                    x={groupX + groupWidth / 2}
                    y="225"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {emptyHint}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
