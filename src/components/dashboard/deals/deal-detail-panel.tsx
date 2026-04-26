"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CRMClientError, getLead, type Deal, type Lead } from "@/lib/crm/client";
import { CompactMeta, DetailSectionCompact } from "@/components/dashboard/customers/customer-ui";

import { DealCommentsPanel } from "./deal-comments-panel";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatStageDuration,
  getStageLabelKey,
  stageBadgeClasses,
} from "./deal-utils";

type DealDetailPanelProps = {
  deal: Deal | null;
  companyLabel: string;
  customerLabel: string;
  sourceLeadLabel: string;
  saving: boolean;
  commentDraft: string;
  onClose: () => void;
  onEdit: (deal: Deal) => void;
  onSchedule: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onCommentDraftChange: (value: string) => void;
  onAddComment: () => void;
  aiEnabled: boolean;
};

export function DealDetailPanel({
  deal,
  companyLabel,
  customerLabel,
  sourceLeadLabel,
  saving,
  commentDraft,
  onClose,
  onEdit,
  onSchedule,
  onDelete,
  onCommentDraftChange,
  onAddComment,
  aiEnabled,
}: Readonly<DealDetailPanelProps>) {
  const t = useTranslations();
  if (!deal) {
    return null;
  }

  const assigneeLabel = deal.assigneeUserName || t("deals.unassigned");
  const dash = "—";

  const reasonText =
    deal.stage === "won"
      ? deal.wonReason || t("deals.noWinReason")
      : deal.stage === "lost"
        ? deal.lossReason || t("deals.noLossReason")
        : t("deals.activeOpportunity");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,_var(--text-primary)_40%,_transparent)] px-0 pt-10 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-float)] sm:rounded-[var(--radius-card-lg)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {t("deals.dealDetail")}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              {deal.name || t("deals.untitledDeal")}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {reasonText}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${stageBadgeClasses(
                deal.stage,
              )}`}
            >
              {t(getStageLabelKey(deal.stage) as never)}
            </span>
            <button
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              {t("common.close")}
            </button>
          </div>
        </div>

        <div className="grid gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMeta label={t("deals.amount")} value={formatMoney(deal.amount, deal.currency)} />
            <CompactMeta label={t("deals.assignee")} value={assigneeLabel} />
            <CompactMeta label={t("deals.closeTarget")} value={formatDate(deal.closeDate)} />
            <CompactMeta label={t("deals.comments")} value={String(deal.comments.length)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={saving}
              onClick={() => onEdit(deal)}
              type="button"
            >
              {t("deals.editDeal")}
            </button>
            <button
              className="rounded-full border border-[color-mix(in_srgb,_var(--accent)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--accent)_10%,_var(--surface))] px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,_var(--accent)_18%,_var(--surface))] disabled:opacity-50"
              disabled={saving}
              onClick={() => onSchedule(deal)}
              type="button"
            >
              {t("deals.scheduleActivity")}
            </button>
            <button
              className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-5 py-3 text-sm font-semibold text-[var(--signal-red)] transition hover:border-[color-mix(in_srgb,_var(--signal-red)_55%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:opacity-50"
              disabled={saving}
              onClick={() => onDelete(deal)}
              type="button"
            >
              {t("deals.delete")}
            </button>
          </div>

          <DetailSectionCompact
            rows={[
              { label: t("deals.fields.company"), value: companyLabel || dash },
              { label: t("deals.fields.customer"), value: customerLabel || dash },
              { label: t("deals.fields.sourceLead"), value: sourceLeadLabel || dash },
              { label: t("deals.fields.currency"), value: deal.currency || dash },
              {
                label: t("deals.fields.termination"),
                value: deal.terminationDate ? formatDate(deal.terminationDate) : t("deals.terminationOpen"),
              },
              { label: t("deals.fields.wonReason"), value: deal.wonReason || dash },
              { label: t("deals.fields.lossReason"), value: deal.lossReason || dash },
              { label: t("deals.fields.created"), value: formatDateTime(deal.createdAt) },
              { label: t("deals.fields.updated"), value: formatDateTime(deal.updatedAt) },
            ]}
            title={t("deals.relatedRecords")}
          />

          <DealCommentsPanel
            commentDraft={commentDraft}
            deal={deal}
            onAddComment={onAddComment}
            onCommentDraftChange={onCommentDraftChange}
            saving={saving}
          />

          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <header className="border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {t("deals.stageHistory")}
              </p>
            </header>
            <div className="grid gap-3 px-4 py-4">
              {deal.stageHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">
                  {t("deals.stageHistoryEmpty")}
                </p>
              ) : (
                deal.stageHistory.map((entry) => (
                  <div
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {t(getStageLabelKey(entry.stage) as never)}
                      </p>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {formatStageDuration(entry)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {t("deals.stageRange", {
                        start: formatDateTime(entry.enteredAt),
                        end: entry.exitedAt ? formatDateTime(entry.exitedAt) : t("deals.now"),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {t("deals.changedBy", {
                        actor: entry.changedByUserName || entry.changedByUserId || t("deals.system"),
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {aiEnabled && deal.sourceLeadId ? (
            <SourceLeadAIInsights key={deal.sourceLeadId} leadId={deal.sourceLeadId} />
          ) : null}

          {Object.keys(deal.extraData).length > 0 ? (
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {t("deals.extraData")}
              </p>
              <pre className="mt-3 overflow-auto rounded-2xl bg-[color-mix(in_srgb,_var(--text-primary)_92%,_transparent)] p-4 text-xs leading-6 text-[var(--surface)]">
                {JSON.stringify(deal.extraData, null, 2)}
              </pre>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/**
 * Loads the deal's source lead and surfaces its AI qualifier metadata.
 * Hidden completely when the source lead is missing or was never scored —
 * avoids cluttering pre-qualifier deals.
 */
function SourceLeadAIInsights({ leadId }: { leadId: string }) {
  const t = useTranslations();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  // leadId is the component's key (parent remounts on change), so initial
  // loading=true from useState is already correct — no synchronous setState
  // inside the effect needed.
  useEffect(() => {
    let cancelled = false;
    getLead(leadId)
      .then((next) => {
        if (!cancelled) setLead(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!(err instanceof CRMClientError)) throw err;
        setLead(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loading) return null;
  if (!lead) return null;

  const hasAny =
    typeof lead.aiScore === "number" || lead.aiStatus || lead.aiReasoning || lead.aiChamp;
  if (!hasAny) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-purple)_8%,_var(--surface))] p-4">
      <header className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--signal-purple)]">
          {t("deals.aiInsights.title")}
        </p>
        {lead.aiLastScoredAt ? (
          <span className="text-xs text-[var(--signal-purple)]">
            {t("deals.aiInsights.scoredAt", { date: formatDateTime(lead.aiLastScoredAt) })}
          </span>
        ) : null}
      </header>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {typeof lead.aiScore === "number" ? (
          <article className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-purple)]">
              {t("deals.aiInsights.aiScore")}
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {Math.round(lead.aiScore)} / 100
            </p>
          </article>
        ) : null}
        {lead.aiStatus ? (
          <article className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-purple)]">
              {t("deals.aiInsights.aiStatus")}
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{lead.aiStatus}</p>
          </article>
        ) : null}
        {lead.aiPath ? (
          <article className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-purple)]">
              {t("deals.aiInsights.path")}
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{lead.aiPath}</p>
          </article>
        ) : null}
      </div>

      {lead.aiReasoning ? (
        <details className="mt-3" open>
          <summary className="cursor-pointer text-xs font-semibold text-[var(--signal-purple)]">
            {t("deals.aiInsights.reasoningReport")}
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-[var(--surface)] p-3 text-xs leading-6 text-[var(--text-primary)]">
            {JSON.stringify(lead.aiReasoning, null, 2)}
          </pre>
        </details>
      ) : null}

      {lead.aiChamp ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--signal-purple)]">
            {t("deals.aiInsights.champExtraction")}
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-[var(--surface)] p-3 text-xs leading-6 text-[var(--text-primary)]">
            {JSON.stringify(lead.aiChamp, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
