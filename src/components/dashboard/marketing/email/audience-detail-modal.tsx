"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpAudienceMembers,
  type MailchimpAudience,
  type MailchimpMember,
} from "@/lib/crm/client";

type AudienceDetailModalProps = {
  companyId: string;
  audience: MailchimpAudience;
  onClose: () => void;
};

const PAGE_SIZE = 25;

// AudienceDetailModal pops over the AudienceList with a paginated member
// table for one audience. Read-only at Phase 1 — write actions
// (tag/archive/upsert) land alongside the push-contacts dialog in a
// subsequent step.
export function AudienceDetailModal({
  companyId,
  audience,
  onClose,
}: Readonly<AudienceDetailModalProps>) {
  const t = useTranslations();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<MailchimpMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial loading=true comes from useState; on page change the
    // prev/next handlers below flip it back to true via setLoading
    // synchronously (allowed inside event handlers, just not inside
    // effect bodies under React 19's set-state-in-effect rule).
    let cancelled = false;
    listMailchimpAudienceMembers(companyId, audience.id, {
      count: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.members ?? []);
        setTotal(res.total_items ?? 0);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.audiences.members.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience.id, companyId, page, t]);

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-w-3xl flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {audience.name}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {t("marketing.email.audiences.members.total")}:{" "}
              {total.toLocaleString()}
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

        <div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <tr>
                <th className="px-4 py-2 font-medium">
                  {t("marketing.email.audiences.members.col.email")}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t("marketing.email.audiences.members.col.status")}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t("marketing.email.audiences.members.col.lastChanged")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[var(--text-tertiary)]">
                    {t("marketing.email.audiences.members.loading")}
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[var(--text-tertiary)]">
                    {t("marketing.email.audiences.members.empty")}
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((m) => (
                  <tr
                    key={m.id || m.email_address}
                    className="border-t border-[var(--border-subtle)]"
                  >
                    <td className="px-4 py-2 text-[var(--text-primary)]">
                      {m.email_address}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {m.last_changed
                        ? new Date(m.last_changed).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>
            {t("marketing.email.audiences.members.page", {
              current: page + 1,
              total: totalPages,
            })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => goToPage(Math.max(0, page - 1))}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 disabled:opacity-50"
            >
              {t("marketing.email.audiences.members.prev")}
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 disabled:opacity-50"
            >
              {t("marketing.email.audiences.members.next")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  // Mailchimp member statuses: subscribed, unsubscribed, cleaned,
  // pending, transactional, archived. We render a small colored chip;
  // the exact color follows the same signal-token palette other parts
  // of the dashboard use (green=good, red=bad, gray=neutral).
  const color =
    status === "subscribed"
      ? "bg-[var(--signal-green-soft)] text-[var(--signal-green)]"
      : status === "unsubscribed" || status === "cleaned"
        ? "bg-[var(--signal-red-soft)] text-[var(--signal-red)]"
        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
