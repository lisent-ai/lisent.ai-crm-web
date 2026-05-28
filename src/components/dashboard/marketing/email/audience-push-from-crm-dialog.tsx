"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listLeads,
  pushCRMLeadsToMailchimpAudience,
  type Lead,
  type PushLeadsResponse,
} from "@/lib/crm/client";

type AudiencePushFromCRMDialogProps = {
  companyId: string;
  listId: string;
  listName: string;
  onClose: () => void;
  onPushed: (result: PushLeadsResponse) => void;
};

// AudiencePushFromCRMDialog lets the operator pick a subset of their
// CRM leads and push them as Mailchimp members in one call. The backend's
// composite endpoint already handles email mapping, MD5 derivation,
// chunking and the per-lead success/fail report (see Step 5's
// push_leads_handler.go); this dialog is just a selection UI.
//
// Filtering is intentionally minimal at Phase 1: a free-text search,
// status pill, and "select all visible / none". Operators with many
// leads filter in the main Leads page first; we don't try to recreate
// that entire filter surface here.
export function AudiencePushFromCRMDialog({
  companyId,
  listId,
  listName,
  onClose,
  onPushed,
}: Readonly<AudiencePushFromCRMDialogProps>) {
  const t = useTranslations();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PushLeadsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    listLeads(companyId)
      .then((rows) => {
        if (cancelled) return;
        setLeads(rows);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.audiences.push.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter && lead.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [lead.name, lead.email, lead.phone, lead.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, search, statusFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handlePush() {
    setSubmitError(null);
    if (selected.size === 0) {
      setSubmitError(t("marketing.email.audiences.push.errNoneSelected"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await pushCRMLeadsToMailchimpAudience(companyId, listId, {
        leadIds: Array.from(selected),
        updateExisting: true,
      });
      setResult(response);
      onPushed(response);
    } catch (err) {
      setSubmitError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.audiences.push.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("marketing.email.audiences.push.title")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("marketing.email.audiences.push.body", { audience: listName })}
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

        {(loadError || submitError) && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {loadError ?? submitError}
          </p>
        )}

        {result ? (
          <ResultView result={result} onClose={onClose} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder={t("marketing.email.audiences.push.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] sm:col-span-2"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="">
                  {t("marketing.email.audiences.push.allStatuses")}
                </option>
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
                <option value="disqualified">Disqualified</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>
                {t("marketing.email.audiences.push.visible", {
                  count: filtered.length,
                })}{" "}
                · {t("marketing.email.audiences.push.selected", { count: selected.size })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="text-[var(--accent)] hover:underline"
                  disabled={filtered.length === 0}
                >
                  {t("marketing.email.audiences.push.selectAll")}
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[var(--accent)] hover:underline"
                  disabled={selected.size === 0}
                >
                  {t("marketing.email.audiences.push.clear")}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
                  {t("marketing.email.audiences.push.loading")}
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
                  {t("marketing.email.audiences.push.empty")}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="px-3 py-2 font-medium">
                        {t("marketing.email.audiences.push.col.name")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("marketing.email.audiences.push.col.email")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("marketing.email.audiences.push.col.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => (
                      <tr
                        key={lead.id}
                        className={`cursor-pointer border-t border-[var(--border-subtle)] ${
                          selected.has(lead.id) ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-subtle)]"
                        } ${!lead.email ? "opacity-60" : ""}`}
                        onClick={() => lead.email && toggleSelect(lead.id)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => lead.email && toggleSelect(lead.id)}
                            disabled={!lead.email}
                          />
                        </td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">
                          {lead.name || "—"}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {lead.email || (
                            <span className="italic text-[var(--text-tertiary)]">
                              {t("marketing.email.audiences.push.noEmail")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {lead.status ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              >
                {t("integrations.mailchimp.cancel")}
              </button>
              <button
                type="button"
                onClick={handlePush}
                disabled={submitting || selected.size === 0}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {submitting
                  ? t("marketing.email.audiences.push.submitting")
                  : t("marketing.email.audiences.push.submit", { count: selected.size })}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  onClose,
}: Readonly<{
  result: PushLeadsResponse;
  onClose: () => void;
}>) {
  const t = useTranslations();
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-4 gap-3 text-sm">
        <Tile label={t("marketing.email.audiences.push.stat.created")} value={result.created} />
        <Tile label={t("marketing.email.audiences.push.stat.updated")} value={result.updated} />
        <Tile label={t("marketing.email.audiences.push.stat.skipped")} value={result.skipped} />
        <Tile
          label={t("marketing.email.audiences.push.stat.errors")}
          value={result.errors}
          danger={result.errors > 0}
        />
      </div>
      <div className="flex-1 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            <tr>
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.audiences.push.col.email")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.audiences.push.col.outcome")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.audiences.push.col.reason")}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((r) => (
              <tr key={r.leadId} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 text-[var(--text-primary)]">{r.email ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-[var(--text-secondary)]">
                  {r.status}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                  {r.reason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {t("marketing.email.audiences.members.close")}
        </button>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  danger,
}: Readonly<{ label: string; value: number; danger?: boolean }>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border px-3 py-2 ${
        danger
          ? "border-[var(--signal-red)] text-[var(--signal-red)]"
          : "border-[var(--border-subtle)] text-[var(--text-primary)]"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}
