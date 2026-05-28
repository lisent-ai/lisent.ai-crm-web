"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpReports,
  type MailchimpReport,
} from "@/lib/crm/client";

import { ReportDetailModal } from "./report-detail-modal";

type ReportListProps = {
  companyId: string;
};

const PAGE_SIZE = 25;

// ReportList renders one row per SENT campaign with high-level KPIs:
// recipients, opens (unique + rate), clicks (unique + rate). Clicking a
// row drops into ReportDetailModal which shows the full per-campaign
// drill-down (geo + email activity + per-recipient opens/clicks).
//
// Mailchimp's /3.0/reports endpoint is read-only — there's no "delete
// report" action, and reports stay forever even if the campaign row is
// deleted. Operators just navigate; no row-level actions in MVP.
export function ReportList({ companyId }: Readonly<ReportListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MailchimpReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMailchimpReports(companyId, {
      count: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.reports ?? []);
        setTotal(res.total_items ?? 0);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.reports.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, page, t]);

  const startPageChange = useCallback((next: number) => {
    setLoading(true);
    setPage(next);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading && items.length === 0) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("marketing.email.reports.loading")}
      </article>
    );
  }

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("marketing.email.reports.title")} · {total}
          </h3>
        </header>

        {error && (
          <p className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">
              {t("marketing.email.reports.emptyTitle")}
            </p>
            <p className="mt-1">{t("marketing.email.reports.emptyBody")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.reports.col.subject")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.reports.col.recipients")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.reports.col.opens")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.reports.col.clicks")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.reports.col.sent")}
                </th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onOpen={() => setSelected(r)}
                />
              ))}
            </tbody>
          </table>
        )}

        <footer className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3 text-xs text-[var(--text-tertiary)]">
          <span>
            {t("marketing.email.campaigns.page", {
              current: page + 1,
              total: totalPages,
            })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => startPageChange(Math.max(0, page - 1))}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 disabled:opacity-50"
            >
              {t("marketing.email.audiences.members.prev")}
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => startPageChange(page + 1)}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 disabled:opacity-50"
            >
              {t("marketing.email.audiences.members.next")}
            </button>
          </div>
        </footer>
      </article>

      {selected && (
        <ReportDetailModal
          companyId={companyId}
          report={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function ReportRow({
  report,
  onOpen,
}: Readonly<{ report: MailchimpReport; onOpen: () => void }>) {
  const t = useTranslations();
  const opensCount = report.opens?.unique_opens ?? 0;
  const openRate =
    typeof report.opens?.open_rate === "number"
      ? `${(report.opens.open_rate * 100).toFixed(1)}%`
      : "—";
  const clicksCount = report.clicks?.unique_clicks ?? 0;
  const clickRate =
    typeof report.clicks?.click_rate === "number"
      ? `${(report.clicks.click_rate * 100).toFixed(1)}%`
      : "—";
  return (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]">
      <td className="px-6 py-3 text-[var(--text-primary)]">
        <div className="font-medium">
          {report.subject_line ?? report.campaign_title ?? report.id}
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          {report.list_name ?? "—"}
        </div>
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">
        {report.emails_sent?.toLocaleString() ?? "—"}
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">
        <div>{opensCount.toLocaleString()}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{openRate}</div>
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">
        <div>{clicksCount.toLocaleString()}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{clickRate}</div>
      </td>
      <td className="px-6 py-3 text-[var(--text-secondary)]">
        {report.send_time
          ? new Date(report.send_time).toLocaleDateString()
          : "—"}
      </td>
      <td className="px-6 py-3 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
        >
          {t("marketing.email.reports.details")}
        </button>
      </td>
    </tr>
  );
}
