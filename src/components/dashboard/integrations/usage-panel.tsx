"use client";

import { useCallback, useEffect, useState } from "react";

import { UsageResponse, getUsage } from "@/lib/qualifier/api-keys-client";

type Props = {
  companyId: string;
  companyName: string;
};

const METRIC_LABELS: Record<string, string> = {
  leads_ingested: "Leads ingested",
  leads_qualified: "Leads qualified",
  api_calls: "API calls",
  llm_tokens: "LLM tokens",
  champ_extractions: "CHAMP extractions",
  sse_sessions: "SSE sessions",
  webhook_deliveries: "Webhook deliveries",
  widget_loads: "Widget loads",
  ask_lisent_queries: "Ask Lisent queries",
  kb_documents: "Knowledge docs",
  active_users: "Active users",
};

const PRIMARY_METRICS = [
  "leads_ingested",
  "leads_qualified",
  "api_calls",
  "llm_tokens",
];

export function UsagePanel({ companyId, companyName }: Readonly<Props>) {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getUsage(companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading usage…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Usage</h2>
          <p className="mt-1 text-sm text-slate-500">
            <strong>{companyName}</strong> — consumption metrics (today +
            month-to-date). Counters reset daily; 48h Redis hot window, then
            aggregated to database.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase text-slate-500">Plan</span>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase text-white">
            {data.plan}
          </span>
          <span className="text-xs text-slate-500">
            Rate limit:{" "}
            {data.rate_limit_per_min === null
              ? "unlimited"
              : `${data.rate_limit_per_min}/min`}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          Primary metrics
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY_METRICS.map((metric) => (
            <MetricCard
              key={metric}
              label={METRIC_LABELS[metric] ?? metric}
              today={data.today[metric] ?? 0}
              monthToDate={data.month_to_date[metric] ?? 0}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          All metrics (month-to-date)
        </h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left font-semibold">Metric</th>
                <th className="p-3 text-right font-semibold">Today</th>
                <th className="p-3 text-right font-semibold">Month-to-date</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(METRIC_LABELS).map((metric) => (
                <tr key={metric} className="border-t border-slate-200">
                  <td className="p-3 text-slate-800">
                    {METRIC_LABELS[metric]}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-slate-700">
                    {(data.today[metric] ?? 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-slate-700">
                    {(data.month_to_date[metric] ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  today,
  monthToDate,
}: Readonly<{ label: string; today: number; monthToDate: number }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">
        {today.toLocaleString()}
      </div>
      <div className="text-xs text-slate-500">
        today · <span className="font-mono">{monthToDate.toLocaleString()}</span>{" "}
        MTD
      </div>
    </div>
  );
}
