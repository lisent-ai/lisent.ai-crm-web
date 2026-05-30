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
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAgencies(companyId, {
      status: statusFilter || undefined,
      q: searchQuery || undefined,
      limit: 500,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items ?? []);
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
  }, [companyId, statusFilter, searchQuery, refreshTick]);

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

  // Bulk delete runs sequentially: a parallel Promise.all would still
  // be capped by the browser's per-origin connection limit (~6) and a
  // failure halfway through would leave the operator without a clean
  // "which ones failed" report. Sequential gives us a deterministic
  // per-id error trail and keeps the backend's audit log readable.
  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} ${ids.length === 1 ? "agency" : "agencies"}?\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setActionError(null);
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

  const selectedCount = selectedIds.size;

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        {/* Row 1 — title + always-visible actions */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Agencies · {items.length}
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
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-6 py-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {selectedCount} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPush(true)}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              >
                Push to Mailchimp
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="rounded-full border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)] disabled:opacity-50"
              >
                {bulkDeleting ? "Deleting…" : `Delete ${selectedCount}`}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline"
              >
                Clear
              </button>
            </div>
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
                    aria-label="Select all"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedIds.size > 0 && selectedIds.size < items.length;
                      }
                    }}
                    onChange={(e) => {
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
                    selected={selectedIds.has(row.id)}
                    onToggleSelect={() => {
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
