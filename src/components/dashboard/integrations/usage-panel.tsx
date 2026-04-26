"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { UsageResponse, getUsage } from "@/lib/qualifier/api-keys-client";

type Props = {
  companyId: string;
  companyName: string;
};

const METRIC_KEYS = [
  "leads_ingested",
  "leads_qualified",
  "api_calls",
  "llm_tokens",
  "champ_extractions",
  "sse_sessions",
  "webhook_deliveries",
  "widget_loads",
  "ask_lisent_queries",
  "kb_documents",
  "active_users",
] as const;

const PRIMARY_METRICS = [
  "leads_ingested",
  "leads_qualified",
  "api_calls",
  "llm_tokens",
];

function metricLabel(t: ReturnType<typeof useTranslations>, metric: string): string {
  // Map snake_case metric → camelCase i18n key
  const keyMap: Record<string, string> = {
    leads_ingested: "leadsIngested",
    leads_qualified: "leadsQualified",
    api_calls: "apiCalls",
    llm_tokens: "llmTokens",
    champ_extractions: "champExtractions",
    sse_sessions: "sseSessions",
    webhook_deliveries: "webhookDeliveries",
    widget_loads: "widgetLoads",
    ask_lisent_queries: "askLisentQueries",
    kb_documents: "kbDocuments",
    active_users: "activeUsers",
  };
  const camelKey = keyMap[metric];
  if (!camelKey) return metric;
  return t(`integrations.usage.metrics.${camelKey}` as never);
}

export function UsagePanel({ companyId, companyName }: Readonly<Props>) {
  const t = useTranslations();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getUsage(companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrations.usage.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("integrations.usage.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
            {t("integrations.usage.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {t.rich("integrations.usage.description", {
              name: companyName,
              strong: (chunks) => (
                <strong className="text-[var(--text-secondary)]">{chunks}</strong>
              ),
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          {loading ? t("integrations.usage.refreshing") : t("integrations.usage.refresh")}
        </button>
      </header>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("integrations.usage.plan")}
          </span>
          <span className="rounded-full bg-[var(--text-primary)] px-3 py-1 text-xs font-semibold uppercase text-white">
            {data.plan}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("integrations.usage.rateLimit")}:{" "}
            {data.rate_limit_per_min === null
              ? t("integrations.usage.unlimited")
              : t("integrations.usage.perMin", { count: data.rate_limit_per_min })}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.usage.primaryMetrics")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY_METRICS.map((metric) => (
            <MetricCard
              key={metric}
              label={metricLabel(t, metric)}
              today={data.today[metric] ?? 0}
              monthToDate={data.month_to_date[metric] ?? 0}
              todayLabel={t("integrations.usage.today")}
              mtdLabel={t("integrations.usage.mtdShort")}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.usage.allMetrics")}
        </h3>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <tr>
                  <th className="p-3 text-left font-semibold">{t("integrations.usage.metricColumn")}</th>
                  <th className="p-3 text-right font-semibold">{t("integrations.usage.todayColumn")}</th>
                  <th className="p-3 text-right font-semibold">{t("integrations.usage.mtdColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_KEYS.map((metric) => (
                  <tr key={metric} className="border-t border-[var(--border-subtle)]">
                    <td className="p-3 text-[var(--text-secondary)]">
                      {metricLabel(t, metric)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-[var(--text-secondary)]">
                      {(data.today[metric] ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-[var(--text-secondary)]">
                      {(data.month_to_date[metric] ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  today,
  monthToDate,
  todayLabel,
  mtdLabel,
}: Readonly<{
  label: string;
  today: number;
  monthToDate: number;
  todayLabel: string;
  mtdLabel: string;
}>) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
        {today.toLocaleString()}
      </div>
      <div className="text-xs text-[var(--text-tertiary)]">
        {todayLabel} · <span className="font-mono">{monthToDate.toLocaleString()}</span>{" "}
        {mtdLabel}
      </div>
    </div>
  );
}
