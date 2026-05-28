"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpAudienceMembers,
  type MailchimpAudience,
  type MailchimpMember,
} from "@/lib/crm/client";

import { AudienceAddMemberModal } from "./audience-add-member-modal";
import { AudienceCSVUploadModal } from "./audience-csv-upload-modal";
import { AudiencePushFromCRMDialog } from "./audience-push-from-crm-dialog";
import { AudienceSegmentList } from "./audience-segment-list";
import { AudienceTagsList } from "./audience-tags-list";

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
  const [tab, setTab] = useState<"members" | "segments" | "tags">("members");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<MailchimpMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [showPush, setShowPush] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    // Only fetch members when the Members tab is active. Switching to
    // Segments/Tags doesn't refetch members — those sub-views have
    // their own effects.
    if (tab !== "members") return undefined;
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
    // refreshTick re-fires the fetch after add / CSV / push completes.
  }, [audience.id, companyId, page, refreshTick, tab, t]);

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

        <div className="flex flex-wrap gap-2 border-y border-[var(--border-subtle)] py-3">
          <ActionButton
            label={t("marketing.email.audiences.actions.addMember")}
            description={t("marketing.email.audiences.actions.addMemberHint")}
            onClick={() => setShowAdd(true)}
            primary
          />
          <ActionButton
            label={t("marketing.email.audiences.actions.uploadCsv")}
            description={t("marketing.email.audiences.actions.uploadCsvHint")}
            onClick={() => setShowCSV(true)}
          />
          <ActionButton
            label={t("marketing.email.audiences.actions.pushFromCRM")}
            description={t("marketing.email.audiences.actions.pushFromCRMHint")}
            onClick={() => setShowPush(true)}
          />
        </div>

        <nav className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto border-b border-[var(--border-subtle)]">
          {(["members", "segments", "tags"] as const).map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm transition ${
                  active
                    ? "font-semibold text-[var(--text-primary)]"
                    : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t(`marketing.email.audiences.subtabs.${key}` as never)}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {tab === "members" && (
          <>
            <div className="max-h-[55vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
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
          </>
        )}

        {tab === "segments" && (
          <div className="max-h-[55vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3">
            <AudienceSegmentList companyId={companyId} listId={audience.id} />
          </div>
        )}

        {tab === "tags" && (
          <div className="max-h-[55vh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3">
            <AudienceTagsList companyId={companyId} listId={audience.id} />
          </div>
        )}
      </div>

      {showAdd && (
        <AudienceAddMemberModal
          companyId={companyId}
          listId={audience.id}
          listName={audience.name}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            refresh();
          }}
        />
      )}
      {showCSV && (
        <AudienceCSVUploadModal
          companyId={companyId}
          listId={audience.id}
          listName={audience.name}
          onClose={() => setShowCSV(false)}
          onImported={() => {
            // Modal keeps itself open on its success screen so the
            // operator sees the counts. They close → we refresh.
            refresh();
          }}
        />
      )}
      {showPush && (
        <AudiencePushFromCRMDialog
          companyId={companyId}
          listId={audience.id}
          listName={audience.name}
          onClose={() => setShowPush(false)}
          onPushed={() => refresh()}
        />
      )}
    </div>
  );
}

function ActionButton({
  label,
  description,
  onClick,
  primary,
}: Readonly<{
  label: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-[var(--radius-card)] px-4 py-3 text-left text-sm transition ${
        primary
          ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
          : "border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span
        className={`text-xs ${primary ? "text-white/85" : "text-[var(--text-tertiary)]"}`}
      >
        {description}
      </span>
    </button>
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
