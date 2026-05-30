"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  deleteAgency,
  listAgencies,
  type Agency,
  type AgencyStatus,
} from "@/lib/crm/client";

import { AgencyCreateModal } from "./agency-create-modal";
import { AgencyImportModal } from "./agency-import-modal";
import { AgencyPushDialog } from "./agency-push-dialog";

// AgencyList — the directory view. The header is split into three
// stable rows so nothing wraps unpredictably:
//
//   1. Title + always-visible action buttons (Refresh / Import / New)
//   2. Search field + status filter
//   3. A selection bar that mounts only when rows are ticked
//      (Push / Delete / Clear selection) — keeps the resting state
//      uncluttered.
//
// The table itself sits inside an overflow-x-auto wrapper so the
// 8-column directory scrolls horizontally on narrow screens instead
// of crushing rows.
export function AgencyList({ companyId }: Readonly<{ companyId: string }>) {
  const [items, setItems] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Agency | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgencyStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // selectAllMatching = "the operator wants every row matching the
  // current filter selected, not just this page". We don't materialise
  // 5000 IDs into selectedIds — the bulk-delete path expands the flag
  // back into IDs lazily by paginating through listAgencies.
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  // Reset to the first page whenever a filter or page size changes —
  // landing on a page that no longer has rows is the most common
  // pagination footgun.
  useEffect(() => {
    setPage(0);
    // Filter change invalidates a "select all matching" intent — the
    // matching set just changed under the operator. Drop both flags
    // so they re-tick deliberately.
    setSelectAllMatching(false);
    setSelectedIds(new Set());
  }, [statusFilter, searchQuery, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAgencies(companyId, {
      status: statusFilter || undefined,
      q: searchQuery || undefined,
      limit: pageSize,
      offset: page * pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load agencies.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, statusFilter, searchQuery, refreshTick, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = useCallback(
    async (agency: Agency) => {
      if (
        !window.confirm(
          `Delete ${agency.name}?\n\nThis removes the agency from the CRM. It does not touch any Mailchimp subscriber created from this row.`,
        )
      ) {
        return;
      }
      try {
        await deleteAgency(companyId, agency.id);
        setActionError(null);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to delete the agency.",
        );
      }
    },
    [companyId, refresh],
  );

  // resolveTargetIds expands the selection into a concrete ID list.
  // In page-mode we already have the IDs in selectedIds. In
  // "all matching" mode we walk listAgencies in 500-row chunks (the
  // backend's hard cap) and concatenate — typical case is one round
  // trip, only thousand-row companies pay for more.
  async function resolveTargetIds(): Promise<string[]> {
    if (!selectAllMatching) return Array.from(selectedIds);
    const out: string[] = [];
    const chunk = 500;
    for (let offset = 0; offset < total; offset += chunk) {
      const res = await listAgencies(companyId, {
        status: statusFilter || undefined,
        q: searchQuery || undefined,
        limit: chunk,
        offset,
      });
      for (const a of res.items ?? []) out.push(a.id);
      if ((res.items ?? []).length < chunk) break;
    }
    return out;
  }

  // Bulk delete runs sequentially: a parallel Promise.all would still
  // be capped by the browser's per-origin connection limit (~6) and a
  // failure halfway through would leave the operator without a clean
  // "which ones failed" report. Sequential gives us a deterministic
  // per-id error trail and keeps the backend's audit log readable.
  async function handleBulkDelete() {
    setBulkDeleting(true);
    setActionError(null);
    let ids: string[];
    try {
      ids = await resolveTargetIds();
    } catch (err) {
      setBulkDeleting(false);
      setActionError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to resolve target rows.",
      );
      return;
    }
    if (ids.length === 0) {
      setBulkDeleting(false);
      return;
    }
    if (
      !window.confirm(
        `Delete ${ids.length} ${ids.length === 1 ? "agency" : "agencies"}?\n\nThis cannot be undone.`,
      )
    ) {
      setBulkDeleting(false);
      return;
    }
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await deleteAgency(companyId, id);
      } catch (err) {
        const name = items.find((a) => a.id === id)?.name ?? id;
        const msg =
          err instanceof CRMClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "unknown error";
        failed.push(`${name}: ${msg}`);
      }
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    if (failed.length > 0) {
      setActionError(
        `${failed.length} of ${ids.length} could not be deleted:\n${failed.slice(0, 5).join("\n")}${failed.length > 5 ? `\n…and ${failed.length - 5} more` : ""}`,
      );
    }
    refresh();
  }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  // Effective count: "all matching" mode reports the filter total even
  // before we've materialised IDs (we materialise lazily on action).
  const effectiveSelectedCount = selectAllMatching ? total : selectedIds.size;
  const pageFullySelected =
    items.length > 0 && items.every((a) => selectedIds.has(a.id));
  const showSelectAllMatchingBanner =
    !selectAllMatching && pageFullySelected && total > items.length;

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        {/* Row 1 — title + always-visible actions */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Agencies · {total}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              Import spreadsheet
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              New agency
            </button>
          </div>
        </header>

        {/* Row 2 — search + filter */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-6 py-2">
          <form onSubmit={applySearch} className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, contact, email"
              className="w-72 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AgencyStatus | "")
              }
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
            <button
              type="submit"
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              Apply
            </button>
            {(searchQuery || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setStatusFilter("");
                }}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline"
              >
                Clear filters
              </button>
            )}
          </form>
        </div>

        {/* Row 3 — selection bar (mounts only when there's a selection) */}
        {effectiveSelectedCount > 0 && (
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-6 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {selectAllMatching
                  ? `All ${total} matching the current filter selected`
                  : `${selectedIds.size} selected on this page`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={selectAllMatching}
                  onClick={() => setShowPush(true)}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                  title={
                    selectAllMatching
                      ? "Pick rows on this page to push (cross-page push isn't supported)."
                      : ""
                  }
                >
                  Push to Mailchimp
                </button>
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={handleBulkDelete}
                  className="rounded-full border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)] disabled:opacity-50"
                >
                  {bulkDeleting
                    ? "Deleting…"
                    : `Delete ${effectiveSelectedCount}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setSelectAllMatching(false);
                  }}
                  className="text-xs text-[var(--text-tertiary)] underline hover:text-[var(--text-secondary)]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* The "extend selection across pages" banner mirrors the
                Gmail / Notion pattern: tick the page-header checkbox
                first, then click here to widen the intent to every
                row matching the current filter. */}
            {showSelectAllMatchingBanner && (
              <div className="text-xs text-[var(--text-secondary)]">
                All {items.length} on this page are selected.{" "}
                <button
                  type="button"
                  onClick={() => setSelectAllMatching(true)}
                  className="font-semibold text-[var(--accent)] underline"
                >
                  Select all {total} matching the current filter
                </button>
              </div>
            )}
            {selectAllMatching && (
              <div className="text-xs text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectAllMatching(false);
                    // Drop back to "this page only" so the operator
                    // doesn't lose the on-page ticks they had before.
                  }}
                  className="font-semibold text-[var(--accent)] underline"
                >
                  Just select this page ({items.length})
                </button>
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="whitespace-pre-line border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-xs text-[var(--signal-red)]">
            {actionError}
          </div>
        )}
        {error && (
          <div className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-xs text-[var(--signal-red)]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <tr>
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={
                      selectAllMatching ||
                      (items.length > 0 && selectedIds.size === items.length)
                    }
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          !selectAllMatching &&
                          selectedIds.size > 0 &&
                          selectedIds.size < items.length;
                      }
                    }}
                    onChange={(e) => {
                      setSelectAllMatching(false);
                      setSelectedIds(
                        e.target.checked
                          ? new Set(items.map((a) => a.id))
                          : new Set(),
                      );
                    }}
                  />
                </th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Email / Phone</th>
                <th className="px-4 py-2 font-medium">Window</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Tags</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[var(--text-tertiary)]">
                    Loading agencies…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[var(--text-tertiary)]">
                    No agencies yet. Add one or import a spreadsheet.
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((row) => (
                  <AgencyRow
                    key={row.id}
                    row={row}
                    selected={selectAllMatching || selectedIds.has(row.id)}
                    onToggleSelect={() => {
                      // Any per-row tick collapses "all matching" mode
                      // back to a page-mode selection so the operator
                      // can hand-curate from a checked-all state.
                      if (selectAllMatching) {
                        setSelectAllMatching(false);
                        const next = new Set(items.map((a) => a.id));
                        next.delete(row.id);
                        setSelectedIds(next);
                        return;
                      }
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(row.id)) next.delete(row.id);
                        else next.add(row.id);
                        return next;
                      });
                    }}
                    onEdit={() => setEditing(row)}
                    onDelete={() => handleDelete(row)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — only render when there's more than one page so
            the resting view stays clean for short lists. */}
        {total > pageSize && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        )}
      </article>

      {showCreate && (
        <AgencyCreateModal
          companyId={companyId}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <AgencyCreateModal
          companyId={companyId}
          initialAgency={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {showImport && (
        <AgencyImportModal
          companyId={companyId}
          onClose={() => {
            setShowImport(false);
            refresh();
          }}
          onImported={() => refresh()}
        />
      )}
      {showPush && (
        <AgencyPushDialog
          companyId={companyId}
          selected={items.filter((a) => selectedIds.has(a.id))}
          onClose={() => setShowPush(false)}
          onPushed={() => {
            // Keep the dialog open so the operator can read the
            // per-row result. The push doesn't mutate agency rows
            // so the list doesn't need a refresh.
          }}
        />
      )}
    </>
  );
}

function AgencyRow({
  row,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: Readonly<{
  row: Agency;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}>) {
  const window = formatWindow(row.starts_at, row.ends_at);
  return (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${row.name}`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-[var(--text-primary)]">{row.name}</div>
        {row.notes && (
          <div className="line-clamp-1 max-w-xs text-xs text-[var(--text-tertiary)]">
            {row.notes}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--text-primary)]">
        {row.contact_person || "—"}
      </td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">
        <div>{row.email || "—"}</div>
        {row.phone && (
          <div className="text-xs text-[var(--text-tertiary)]">{row.phone}</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text-secondary)]">
        {window}
      </td>
      <td className="px-4 py-3">
        <StatusPill status={row.status} />
      </td>
      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
        {row.tags.length === 0 ? (
          "—"
        ) : (
          <div className="flex max-w-[200px] flex-wrap gap-1">
            {row.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
}: Readonly<{
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (n: number) => void;
  onPageSize: (n: number) => void;
}>) {
  // Compact page-number strip: always show first, last, current ±1,
  // and ellipses for the gaps. For ≤7 pages we just show them all —
  // simpler and avoids ellipsis flicker as the operator pages around.
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 2) pages.push("...");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 3) pages.push("...");
    pages.push(totalPages - 1);
  }

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-6 py-3 text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-2">
        <span>
          {from}–{to} of {total}
        </span>
        <label className="flex items-center gap-1">
          <span className="text-[var(--text-tertiary)]">Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="rounded border border-[var(--border-subtle)] bg-[var(--surface)] px-1 py-0.5"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="rounded-full border border-[var(--border-subtle)] px-2 py-1 disabled:opacity-40"
          aria-label="Previous page"
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`gap-${i}`}
              className="px-2 text-[var(--text-tertiary)]"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`min-w-[28px] rounded-full px-2 py-1 ${
                p === page
                  ? "bg-[var(--accent)] font-semibold text-white"
                  : "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          className="rounded-full border border-[var(--border-subtle)] px-2 py-1 disabled:opacity-40"
          aria-label="Next page"
        >
          ›
        </button>
      </nav>
    </div>
  );
}

function StatusPill({ status }: Readonly<{ status: AgencyStatus }>) {
  const cls =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "inactive"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function formatWindow(
  startsAt?: string | null,
  endsAt?: string | null,
): string {
  if (!startsAt && !endsAt) return "—";
  const fmt = (d: string) => new Date(d).toLocaleDateString();
  if (startsAt && endsAt) return `${fmt(startsAt)} → ${fmt(endsAt)}`;
  if (startsAt) return `From ${fmt(startsAt)}`;
  return `Until ${fmt(endsAt!)}`;
}
