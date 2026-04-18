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
  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-slate-50">
      <header className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
            Comments
          </p>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            {deal.comments.length}
          </span>
        </div>
      </header>

      <div className="grid gap-4 px-4 py-4">
        <div className="grid gap-3">
          <textarea
            className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder="Leave an update, note, or handoff for the team..."
            value={commentDraft}
          />
          <div className="flex justify-end">
            <button
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={saving || !commentDraft.trim()}
              onClick={onAddComment}
              type="button"
            >
              {saving ? "Posting..." : "Add comment"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {deal.comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
              No comments yet. Start the thread for this deal.
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
  const authorLabel = comment.authorUserName || comment.authorUserId || "Unknown";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
          {buildInitials(authorLabel)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-950">{authorLabel}</p>
            <p className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</p>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {comment.body}
          </p>
        </div>
      </div>
    </div>
  );
}
