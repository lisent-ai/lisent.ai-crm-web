"use client";

import { useTranslations } from "next-intl";

import type { Deal, DealComment } from "@/lib/crm/client";

import { buildInitials, formatDateTime } from "./deal-utils";

type DealCommentsPanelProps = {
  deal: Deal;
  commentDraft: string;
  saving: boolean;
  onCommentDraftChange: (value: string) => void;
  onAddComment: () => void;
};

export function DealCommentsPanel({
  deal,
  commentDraft,
  saving,
  onCommentDraftChange,
  onAddComment,
}: Readonly<DealCommentsPanelProps>) {
  const t = useTranslations();
  return (
    <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            {t("deals.comments")}
          </p>
          <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {deal.comments.length}
          </span>
        </div>
      </header>

      <div className="grid gap-4 px-4 py-4">
        <div className="grid gap-3">
          <textarea
            className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder={t("deals.commentPlaceholder")}
            value={commentDraft}
          />
          <div className="flex justify-end">
            <button
              className="rounded-full bg-[var(--text-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={saving || !commentDraft.trim()}
              onClick={onAddComment}
              type="button"
            >
              {saving ? t("deals.posting") : t("deals.addComment")}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {deal.comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
              {t("deals.commentsEmpty")}
            </div>
          ) : (
            deal.comments.map((comment) => (
              <DealCommentRow comment={comment} key={comment.id} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DealCommentRow({ comment }: Readonly<{ comment: DealComment }>) {
  const t = useTranslations();
  const authorLabel = comment.authorUserName || comment.authorUserId || t("deals.unknownAuthor");

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--text-primary)] text-xs font-semibold text-white">
          {buildInitials(authorLabel)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{authorLabel}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{formatDateTime(comment.createdAt)}</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
            {comment.body}
          </p>
        </div>
      </div>
    </div>
  );
}
