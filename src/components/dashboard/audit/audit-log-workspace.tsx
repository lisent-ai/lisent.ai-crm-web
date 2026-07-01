"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { CRMClientError, listCompanyAuditLog, type AuditEvent } from "@/lib/crm/client";
import { auditActionLabel, auditActorLabel, auditDetail } from "@/lib/audit/format";
import { formatDateTime } from "@/components/dashboard/leads/lead-utils";

const PAGE_SIZE = 30;

// Company-wide audit log (admin). Shows who did what, to which item, when.
// Server enforces owner/super_admin (403 → access-denied state).
export function AuditLogWorkspace() {
  const t = useTranslations();
  const translate = t as unknown as (key: string) => string;
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") ?? "";
  const companyName = searchParams.get("companyName") ?? "";

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backHref = companyId
    ? `/dashboard/leads?${new URLSearchParams({ company: companyId, ...(companyName ? { companyName } : {}) }).toString()}`
    : "/dashboard/leads";

  const load = useCallback(async () => {
    if (!companyId) {
      setEvents([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await listCompanyAuditLog(companyId, { limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setEvents(result.data);
      setTotal(result.total);
      setAccessDenied(false);
    } catch (error) {
      if (error instanceof CRMClientError && error.status === 403) {
        setAccessDenied(true);
        setEvents([]);
        setTotal(0);
      } else {
        setErrorMessage(error instanceof CRMClientError ? error.message : t("audit.loadFailed"));
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;
  const btn =
    "inline-flex h-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("audit.backToLeads")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t("audit.title")}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-tertiary)]">{t("audit.subtitle")}</p>
      </div>

      {errorMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}

      {accessDenied ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {t("audit.accessDenied")}
        </div>
      ) : (
        <section className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
              {t("audit.loading")}
            </div>
          ) : events.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
              {t("audit.empty")}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                      <th className="px-5 py-3 font-medium">{t("audit.columns.time")}</th>
                      <th className="px-5 py-3 font-medium">{t("audit.columns.actor")}</th>
                      <th className="px-5 py-3 font-medium">{t("audit.columns.action")}</th>
                      <th className="px-5 py-3 font-medium">{t("audit.columns.entity")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const detail = auditDetail(event);
                      return (
                        <tr
                          className="border-b border-[var(--border-subtle)] last:border-0"
                          key={event.id}
                        >
                          <td className="whitespace-nowrap px-5 py-3 text-[var(--text-secondary)]">
                            {formatDateTime(event.createdAt)}
                          </td>
                          <td className="px-5 py-3 text-[var(--text-secondary)]">
                            {auditActorLabel(translate, event)}
                          </td>
                          <td className="px-5 py-3 text-[var(--text-primary)]">
                            {auditActionLabel(translate, event.action)}
                            {detail ? (
                              <span className="text-[var(--text-tertiary)]"> · {detail}</span>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 text-[var(--text-tertiary)]">
                            {event.entityType}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 p-4 md:hidden">
                {events.map((event) => {
                  const detail = auditDetail(event);
                  return (
                    <div
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
                      key={event.id}
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {auditActionLabel(translate, event.action)}
                        {detail ? (
                          <span className="font-normal text-[var(--text-secondary)]"> · {detail}</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {auditActorLabel(translate, event)} · {formatDateTime(event.createdAt)} ·{" "}
                        {event.entityType}
                      </p>
                    </div>
                  );
                })}
              </div>

              {total > PAGE_SIZE ? (
                <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {t("pagination.showing", { from, to, total })}
                  </span>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <button
                      className={btn}
                      disabled={loading || !canPrev}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      type="button"
                    >
                      {t("pagination.previous")}
                    </button>
                    <span className="whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">
                      {t("pagination.page", { page: page + 1, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) })}
                    </span>
                    <button
                      className={btn}
                      disabled={loading || !canNext}
                      onClick={() => setPage((p) => p + 1)}
                      type="button"
                    >
                      {t("pagination.next")}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}
    </div>
  );
}
