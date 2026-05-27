"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  deleteMailchimpCampaign,
  listMailchimpCampaigns,
  pauseMailchimpCampaign,
  resumeMailchimpCampaign,
  sendMailchimpCampaign,
  type MailchimpCampaign,
} from "@/lib/crm/client";

import { CampaignCreateModal } from "./campaign-create-modal";
import { CampaignSendTestDialog } from "./campaign-send-test-dialog";

type CampaignListProps = {
  companyId: string;
};

const PAGE_SIZE = 25;

// CampaignList renders Mailchimp campaigns with a "New campaign" CTA and
// per-row inline actions whose visibility follows Mailchimp's documented
// status state machine:
//
//   save (draft)  → Send, Send test, Edit, Delete
//   schedule      → (no operator-facing actions in MVP; cancel-schedule
//                    lands in a follow-up)
//   sending       → Pause
//   paused        → Resume
//   sent          → Send test (re-send not allowed by Mailchimp), Delete
//
// Pagination is offset-based at 25/page; Mailchimp's list endpoint accepts
// `count` + `offset` so deep workspaces stay performant without a cursor.
export function CampaignList({ companyId }: Readonly<CampaignListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [testTarget, setTestTarget] = useState<MailchimpCampaign | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listMailchimpCampaigns(companyId, {
      count: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sort_field: "create_time",
      sort_dir: "DESC",
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.campaigns ?? []);
        setTotal(res.total_items ?? 0);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.campaigns.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, page, refreshTick, t]);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  const onCreated = useCallback(() => {
    setShowCreate(false);
    setPage(0);
    refresh();
  }, [refresh]);

  const handleSend = useCallback(
    async (campaign: MailchimpCampaign) => {
      const audience = campaign.recipients?.list_name ?? "this audience";
      if (
        !window.confirm(
          t("marketing.email.campaigns.confirmSend", {
            subject: campaign.settings?.subject_line ?? campaign.id,
            audience,
          }),
        )
      ) {
        return;
      }
      try {
        await sendMailchimpCampaign(companyId, campaign.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.campaigns.sendFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  const handleDelete = useCallback(
    async (campaign: MailchimpCampaign) => {
      if (!window.confirm(t("marketing.email.campaigns.confirmDelete"))) return;
      try {
        await deleteMailchimpCampaign(companyId, campaign.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.campaigns.deleteFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  const handlePauseOrResume = useCallback(
    async (campaign: MailchimpCampaign) => {
      try {
        if (campaign.status === "sending") {
          await pauseMailchimpCampaign(companyId, campaign.id);
        } else if (campaign.status === "paused") {
          await resumeMailchimpCampaign(companyId, campaign.id);
        }
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.campaigns.actionFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  const startPageChange = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading && items.length === 0) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("marketing.email.campaigns.loading")}
      </article>
    );
  }

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("marketing.email.campaigns.title")} · {total}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              {t("marketing.email.campaigns.refresh")}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              {t("marketing.email.campaigns.newCampaign")}
            </button>
          </div>
        </header>

        {(error || actionError) && (
          <p className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-sm text-[var(--signal-red)]">
            {error ?? actionError}
          </p>
        )}

        {items.length === 0 && !loading ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">
              {t("marketing.email.campaigns.emptyTitle")}
            </p>
            <p className="mt-1">{t("marketing.email.campaigns.emptyBody")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.campaigns.col.subject")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.campaigns.col.audience")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.campaigns.col.status")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.campaigns.col.created")}
                </th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  onSend={() => handleSend(c)}
                  onSendTest={() => setTestTarget(c)}
                  onDelete={() => handleDelete(c)}
                  onPauseResume={() => handlePauseOrResume(c)}
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

      {showCreate && (
        <CampaignCreateModal
          companyId={companyId}
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}

      {testTarget && (
        <CampaignSendTestDialog
          companyId={companyId}
          campaign={testTarget}
          onClose={() => setTestTarget(null)}
        />
      )}
    </>
  );
}

function CampaignRow({
  campaign,
  onSend,
  onSendTest,
  onDelete,
  onPauseResume,
}: Readonly<{
  campaign: MailchimpCampaign;
  onSend: () => void;
  onSendTest: () => void;
  onDelete: () => void;
  onPauseResume: () => void;
}>) {
  const t = useTranslations();
  const subject = campaign.settings?.subject_line ?? campaign.settings?.title ?? campaign.id;
  const audience = campaign.recipients?.list_name ?? "—";
  const created = campaign.create_time
    ? new Date(campaign.create_time).toLocaleDateString()
    : "—";
  const isDraft = campaign.status === "save";
  const isSent = campaign.status === "sent";
  const isSending = campaign.status === "sending";
  const isPaused = campaign.status === "paused";
  return (
    <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]">
      <td className="px-6 py-3 text-[var(--text-primary)]">
        <div className="font-medium">{subject}</div>
        <div className="font-mono text-xs text-[var(--text-tertiary)]">{campaign.id}</div>
      </td>
      <td className="px-6 py-3 text-[var(--text-primary)]">{audience}</td>
      <td className="px-6 py-3">
        <StatusBadge status={campaign.status} />
      </td>
      <td className="px-6 py-3 text-[var(--text-secondary)]">{created}</td>
      <td className="px-6 py-3 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {isDraft && (
            <button
              type="button"
              onClick={onSend}
              className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              {t("marketing.email.campaigns.actions.send")}
            </button>
          )}
          <button
            type="button"
            onClick={onSendTest}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
          >
            {t("marketing.email.campaigns.actions.test")}
          </button>
          {(isSending || isPaused) && (
            <button
              type="button"
              onClick={onPauseResume}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
            >
              {isSending
                ? t("marketing.email.campaigns.actions.pause")
                : t("marketing.email.campaigns.actions.resume")}
            </button>
          )}
          {(isDraft || isSent) && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
            >
              {t("marketing.email.campaigns.actions.delete")}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const color =
    status === "sent"
      ? "bg-[var(--signal-green-soft)] text-[var(--signal-green)]"
      : status === "sending" || status === "schedule"
        ? "bg-[var(--signal-amber-soft)] text-[var(--signal-amber)]"
        : status === "paused"
          ? "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
