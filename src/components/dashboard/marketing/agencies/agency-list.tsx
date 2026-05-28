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

// AgencyList — the directory view. Filters (status, search) live in
// local state because the URL already carries ?company=…; layering
// more query params would make the back/forward feel chatty.
//
// Edit flow re-uses the create modal with an initialAgency prop, so the
// wizard's per-step copy stays a single source of truth.
export function AgencyList({ companyId }: Readonly<{ companyId: string }>) {
  const [items, setItems] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgencyStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Agencies · {items.length}
            </h3>
            <form onSubmit={applySearch} className="flex items-center gap-2">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, contact, email"
                className="w-64 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)]"
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as AgencyStatus | "")
                }
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)]"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </form>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
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
        {actionError && (
          <div className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-xs text-[var(--signal-red)]">
            {actionError}
          </div>
        )}
        {error && (
          <div className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-xs text-[var(--signal-red)]">
            {error}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            <tr>
              <th className="px-6 py-2 font-medium">Name</th>
              <th className="px-6 py-2 font-medium">Contact</th>
              <th className="px-6 py-2 font-medium">Email / Phone</th>
              <th className="px-6 py-2 font-medium">Window</th>
              <th className="px-6 py-2 font-medium">Status</th>
              <th className="px-6 py-2 font-medium">Tags</th>
              <th className="px-6 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-[var(--text-tertiary)]">
                  Loading agencies…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-[var(--text-tertiary)]">
                  No agencies yet. Add one or import a spreadsheet.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((row) => (
                <AgencyRow
                  key={row.id}
                  row={row}
                  onEdit={() => setEditing(row)}
                  onDelete={() => handleDelete(row)}
                />
              ))}
          </tbody>
        </table>
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
    </>
  );
}

function AgencyRow({
  row,
  onEdit,
  onDelete,
}: Readonly<{ row: Agency; onEdit: () => void; onDelete: () => void }>) {
  const window = formatWindow(row.starts_at, row.ends_at);
  return (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]">
      <td className="px-6 py-3">
        <div className="font-medium text-[var(--text-primary)]">{row.name}</div>
        {row.notes && (
          <div className="line-clamp-1 text-xs text-[var(--text-tertiary)]">
            {row.notes}
          </div>
        )}
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">
        {row.contact_person || "—"}
      </td>
      <td className="px-6 py-3 text-[var(--text-secondary)]">
        <div>{row.email || "—"}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{row.phone || ""}</div>
      </td>
      <td className="px-6 py-3 text-xs text-[var(--text-secondary)]">{window}</td>
      <td className="px-6 py-3">
        <StatusPill status={row.status} />
      </td>
      <td className="px-6 py-3 text-xs text-[var(--text-secondary)]">
        {row.tags.length === 0 ? (
          "—"
        ) : (
          <div className="flex flex-wrap gap-1">
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
      <td className="px-6 py-3 text-right">
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
