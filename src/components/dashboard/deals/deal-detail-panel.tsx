import { useEffect, useState } from "react";

import { CRMClientError, getLead, type Deal, type Lead } from "@/lib/crm/client";
import { CompactMeta, DetailSectionCompact } from "@/components/dashboard/customers/customer-ui";

import { DealCommentsPanel } from "./deal-comments-panel";
import {
  formatAssigneeLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatStageDuration,
  formatStageLabel,
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
  if (!deal) {
    return null;
  }

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
              Deal detail
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              {deal.name || "Untitled deal"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {deal.stage === "won"
                ? deal.wonReason || "No win reason recorded yet."
                : deal.stage === "lost"
                  ? deal.lossReason || "No loss reason recorded yet."
                  : "Opportunity is still active in the pipeline."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${stageBadgeClasses(
                deal.stage,
              )}`}
            >
              {formatStageLabel(deal.stage)}
            </span>
            <button
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMeta label="Amount" value={formatMoney(deal.amount, deal.currency)} />
            <CompactMeta label="Assignee" value={formatAssigneeLabel(deal)} />
            <CompactMeta label="Close target" value={formatDate(deal.closeDate)} />
            <CompactMeta label="Comments" value={String(deal.comments.length)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={saving}
              onClick={() => onEdit(deal)}
              type="button"
            >
              Edit deal
            </button>
            <button
              className="rounded-full border border-[color-mix(in_srgb,_var(--accent)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--accent)_10%,_var(--surface))] px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,_var(--accent)_18%,_var(--surface))] disabled:opacity-50"
              disabled={saving}
              onClick={() => onSchedule(deal)}
              type="button"
            >
              Schedule activity
            </button>
            <button
              className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-5 py-3 text-sm font-semibold text-[var(--signal-red)] transition hover:border-[color-mix(in_srgb,_var(--signal-red)_55%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:opacity-50"
              disabled={saving}
              onClick={() => onDelete(deal)}
              type="button"
            >
              Delete
            </button>
          </div>

          <DetailSectionCompact
            rows={[
              { label: "Company", value: companyLabel || "—" },
              { label: "Customer", value: customerLabel || "—" },
              { label: "Source lead", value: sourceLeadLabel || "—" },
              { label: "Currency", value: deal.currency || "—" },
              {
                label: "Termination",
                value: deal.terminationDate ? formatDate(deal.terminationDate) : "Open",
              },
              { label: "Won reason", value: deal.wonReason || "—" },
              { label: "Loss reason", value: deal.lossReason || "—" },
              { label: "Created", value: formatDateTime(deal.createdAt) },
              { label: "Updated", value: formatDateTime(deal.updatedAt) },
            ]}
            title="Related records"
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
                Stage history
              </p>
            </header>
            <div className="grid gap-3 px-4 py-4">
              {deal.stageHistory.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">
                  No stage history recorded yet.
                </p>
              ) : (
                deal.stageHistory.map((entry) => (
                  <div
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatStageLabel(entry.stage)}
                      </p>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {formatStageDuration(entry)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {formatDateTime(entry.enteredAt)} to{" "}
                      {entry.exitedAt ? formatDateTime(entry.exitedAt) : "Now"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      Changed by {entry.changedByUserName || entry.changedByUserId || "System"}
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
                Extra data
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
          AI insights (source lead)
        </p>
        {lead.aiLastScoredAt ? (
          <span className="text-xs text-[var(--signal-purple)]">
            scored {formatDateTime(lead.aiLastScoredAt)}
          </span>
        ) : null}
      </header>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {typeof lead.aiScore === "number" ? (
          <article className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-purple)]">
              AI score
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {Math.round(lead.aiScore)} / 100
            </p>
          </article>
        ) : null}
        {lead.aiStatus ? (
          <article className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-purple)]">
              AI status
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{lead.aiStatus}</p>
          </article>
        ) : null}
        {lead.aiPath ? (
          <article className="rounded-xl border border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-purple)]">
              Path
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{lead.aiPath}</p>
          </article>
        ) : null}
      </div>

      {lead.aiReasoning ? (
        <details className="mt-3" open>
          <summary className="cursor-pointer text-xs font-semibold text-[var(--signal-purple)]">
            Reasoning report
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-[var(--surface)] p-3 text-xs leading-6 text-[var(--text-primary)]">
            {JSON.stringify(lead.aiReasoning, null, 2)}
          </pre>
        </details>
      ) : null}

      {lead.aiChamp ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--signal-purple)]">
            CHAMP extraction
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-[var(--surface)] p-3 text-xs leading-6 text-[var(--text-primary)]">
            {JSON.stringify(lead.aiChamp, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
