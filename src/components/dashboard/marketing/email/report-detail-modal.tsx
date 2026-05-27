"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  getMailchimpCampaignLocations,
  getMailchimpCampaignReport,
  type MailchimpReport,
} from "@/lib/crm/client";

type ReportDetailModalProps = {
  companyId: string;
  report: MailchimpReport;
  onClose: () => void;
};

type GeoLocation = {
  country?: string;
  region?: string;
  region_name?: string;
  opens?: number;
};

// ReportDetailModal expands a ReportList row into a per-campaign drill-
// down. We refetch the full /reports/{id} payload (the list version
// trims some fields), plus the /locations sub-endpoint for the geo
// breakdown. Heatmap geo data + per-recipient activity (email-activity)
// stays in Mailchimp's own UI; we link out.
export function ReportDetailModal({
  companyId,
  report,
  onClose,
}: Readonly<ReportDetailModalProps>) {
  const t = useTranslations();
  const [full, setFull] = useState<MailchimpReport | null>(null);
  const [locations, setLocations] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getMailchimpCampaignReport(companyId, report.id).catch((err: unknown) => {
        throw err;
      }),
      getMailchimpCampaignLocations(companyId, report.id).catch(() => null),
    ])
      .then(([fullReport, geo]) => {
        if (cancelled) return;
        setFull(fullReport);
        if (geo) {
          const raw = (geo as { locations?: GeoLocation[] }).locations ?? [];
          setLocations(raw.slice(0, 10));
        }
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.reports.detailFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, report.id, t]);

  const data = full ?? report;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {data.subject_line ?? data.campaign_title ?? data.id}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {data.list_name ?? "—"} ·{" "}
              {data.send_time
                ? new Date(data.send_time).toLocaleString()
                : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            aria-label={t("marketing.email.audiences.members.close")}
          >
            ✕
          </button>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            {t("marketing.email.reports.loadingDetail")}
          </p>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KPI
                label={t("marketing.email.reports.kpi.sent")}
                value={data.emails_sent?.toLocaleString() ?? "0"}
              />
              <KPI
                label={t("marketing.email.reports.kpi.opens")}
                value={data.opens?.unique_opens?.toLocaleString() ?? "0"}
                sub={
                  typeof data.opens?.open_rate === "number"
                    ? `${(data.opens.open_rate * 100).toFixed(1)}%`
                    : undefined
                }
              />
              <KPI
                label={t("marketing.email.reports.kpi.clicks")}
                value={data.clicks?.unique_clicks?.toLocaleString() ?? "0"}
                sub={
                  typeof data.clicks?.click_rate === "number"
                    ? `${(data.clicks.click_rate * 100).toFixed(1)}%`
                    : undefined
                }
              />
              <KPI
                label={t("marketing.email.reports.kpi.bounces")}
                value={(
                  (data.bounces?.hard_bounces ?? 0) +
                  (data.bounces?.soft_bounces ?? 0)
                ).toLocaleString()}
                sub={
                  data.bounces?.hard_bounces
                    ? t("marketing.email.reports.kpi.hardBounces", {
                        count: data.bounces.hard_bounces,
                      })
                    : undefined
                }
              />
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                {t("marketing.email.reports.geoTitle")}
              </h4>
              {locations.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t("marketing.email.reports.geoEmpty")}
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-[var(--text-primary)]">
                  {locations.map((loc, idx) => (
                    <li
                      key={`${loc.country}-${loc.region}-${idx}`}
                      className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] px-3 py-1.5"
                    >
                      <span>
                        {loc.country ?? "—"}
                        {loc.region_name ? ` · ${loc.region_name}` : ""}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {loc.opens ?? 0} {t("marketing.email.reports.opens")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-[var(--text-tertiary)]">
              {t("marketing.email.reports.deepLinkHint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
}: Readonly<{ label: string; value: string; sub?: string }>) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
      <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{sub}</div>
      ) : null}
    </div>
  );
}
