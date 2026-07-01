"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";

import {
  CRMClientError,
  listArchivedLeads,
  unarchiveLead,
  type Lead,
} from "@/lib/crm/client";

import { formatDateTime, formatSourceLabel } from "./lead-utils";

const PAGE_SIZE = 25;

export function ArchivedLeadsWorkspace() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") ?? "";
  const companyName = searchParams.get("companyName") ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const backHref = companyId
    ? `/dashboard/leads?${new URLSearchParams({ company: companyId, ...(companyName ? { companyName } : {}) }).toString()}`
    : "/dashboard/leads";

  const load = useCallback(async () => {
    if (!companyId) {
      setLeads([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await listArchivedLeads(
        companyId,
        { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
        { q: query },
      );
      setLeads(result.data);
      setTotal(result.total);
      setAccessDenied(false);
    } catch (error) {
      if (error instanceof CRMClientError && error.status === 403) {
        setAccessDenied(true);
        setLeads([]);
        setTotal(0);
      } else {
        setErrorMessage(
          error instanceof CRMClientError ? error.message : t("leads.archived.loadFailed"),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, page, query, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to first page when the search term changes.
  useEffect(() => {
    setPage(0);
  }, [query]);

  function submitSearch() {
    setQuery(search.trim());
  }

  async function restore(lead: Lead) {
    setRestoringId(lead.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await unarchiveLead(lead.id);
      setSuccessMessage(t("leads.archived.restored"));
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("leads.archived.restoreFailed"),
      );
    } finally {
      setRestoringId(null);
    }
  }

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const currentPage = page + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("leads.archived.backToLeads")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t("leads.archived.title")}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-tertiary)]">
          {t("leads.archived.subtitle")}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-green)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {successMessage}
        </div>
      ) : null}

      {accessDenied ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {t("leads.archived.accessDenied")}
        </div>
      ) : (
        <section className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2">
              <Search aria-hidden="true" className="h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                }}
                placeholder={t("leads.archived.search")}
                value={search}
              />
            </div>
            <button
              className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
              onClick={submitSearch}
              type="button"
            >
              {t("leads.archived.searchAction")}
            </button>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
              {t("leads.archived.loading")}
            </div>
          ) : leads.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
              {t("leads.archived.empty")}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                      <th className="px-5 py-3 font-medium">{t("leads.archived.columns.lead")}</th>
                      <th className="px-5 py-3 font-medium">{t("leads.archived.columns.source")}</th>
                      <th className="px-5 py-3 font-medium">{t("leads.archived.columns.status")}</th>
                      <th className="px-5 py-3 font-medium">{t("leads.archived.columns.archivedBy")}</th>
                      <th className="px-5 py-3 font-medium">{t("leads.archived.columns.archivedAt")}</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        className="border-b border-[var(--border-subtle)] last:border-0"
                        key={lead.id}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-[var(--text-primary)]">
                            {lead.name || t("leads.fallback.unnamedLead")}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {lead.email || lead.phone || "—"}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">
                          {formatSourceLabel(lead.source)}
                        </td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">
                          {t(`leads.status.${lead.status}`)}
                        </td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">
                          {lead.archivedByUserName || "—"}
                        </td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">
                          {lead.archivedAt ? formatDateTime(lead.archivedAt) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <RestoreButton
                            label={
                              restoringId === lead.id
                                ? t("leads.archived.restoring")
                                : t("leads.archived.restore")
                            }
                            disabled={restoringId === lead.id}
                            onClick={() => void restore(lead)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 p-4 md:hidden">
                {leads.map((lead) => (
                  <div
                    className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
                    key={lead.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {lead.name || t("leads.fallback.unnamedLead")}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {lead.email || lead.phone || "—"}
                        </div>
                      </div>
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                        {t(`leads.status.${lead.status}`)}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-tertiary)]">
                      <div>
                        <dt className="uppercase tracking-wide">{t("leads.archived.columns.source")}</dt>
                        <dd className="text-[var(--text-secondary)]">{formatSourceLabel(lead.source)}</dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-wide">{t("leads.archived.columns.archivedBy")}</dt>
                        <dd className="text-[var(--text-secondary)]">{lead.archivedByUserName || "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="uppercase tracking-wide">{t("leads.archived.columns.archivedAt")}</dt>
                        <dd className="text-[var(--text-secondary)]">
                          {lead.archivedAt ? formatDateTime(lead.archivedAt) : "—"}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <RestoreButton
                        label={
                          restoringId === lead.id
                            ? t("leads.archived.restoring")
                            : t("leads.archived.restore")
                        }
                        disabled={restoringId === lead.id}
                        onClick={() => void restore(lead)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {total > PAGE_SIZE ? (
                <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {t("pagination.showing", { from, to, total })}
                  </span>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={loading || !canPrev}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      type="button"
                    >
                      {t("pagination.previous")}
                    </button>
                    <span className="whitespace-nowrap text-xs font-medium text-[var(--text-secondary)]">
                      {t("pagination.page", { page: currentPage, pages: totalPages })}
                    </span>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
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

function RestoreButton({
  label,
  disabled,
  onClick,
}: Readonly<{ label: string; disabled?: boolean; onClick: () => void }>) {
  return (
    <button
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
