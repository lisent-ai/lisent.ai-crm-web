import { PencilLine, Trash2, X } from "lucide-react";

import type { Lead, LeadComment } from "@/lib/crm/client";

import { formatDateTime } from "./lead-utils";

type LeadNotesPanelProps = {
  commentDraft: string;
  comments: LeadComment[];
  currentUserId: string;
  editingCommentBody: string;
  editingCommentId: string | null;
  lead: Lead;
  loading: boolean;
  saving: boolean;
  onAddComment: () => void;
  onDeleteComment: (comment: LeadComment) => void;
  onEditComment: (comment: LeadComment) => void;
  onEditingCommentBodyChange: (value: string) => void;
  onSaveEditedComment: () => void;
  onStopEditing: () => void;
  onCommentDraftChange: (value: string) => void;
};

export function LeadNotesPanel({
  commentDraft,
  comments,
  currentUserId,
  editingCommentBody,
  editingCommentId,
  lead,
  loading,
  saving,
  onAddComment,
  onDeleteComment,
  onEditComment,
  onEditingCommentBodyChange,
  onSaveEditedComment,
  onStopEditing,
  onCommentDraftChange,
}: Readonly<LeadNotesPanelProps>) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Team notes
        </h3>
        <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
          {comments.length}
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        {lead.notes ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Lead context
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
              {lead.notes}
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          <textarea
            className="min-h-28 rounded-2xl border border-[var(--border-default)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-sky-400"
            onChange={(event) => onCommentDraftChange(event.target.value)}
            placeholder="Add a note, update, or handoff for the team..."
            value={commentDraft}
          />
          <div className="flex justify-end">
            <button
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={saving || !commentDraft.trim()}
              onClick={onAddComment}
              type="button"
            >
              {saving ? "Posting..." : "Add note"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
              Loading team notes...
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
              No team notes yet. Start the thread for this lead.
            </div>
          ) : (
            comments.map((comment) => (
              <LeadCommentRow
                canManage={
                  !!currentUserId && comment.authorUserId === currentUserId
                }
                comment={comment}
                editingBody={editingCommentBody}
                isEditing={editingCommentId === comment.id}
                key={comment.id}
                onDelete={() => onDeleteComment(comment)}
                onEdit={() => onEditComment(comment)}
                onEditingBodyChange={onEditingCommentBodyChange}
                onSave={onSaveEditedComment}
                onStopEditing={onStopEditing}
                saving={saving}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function LeadCommentRow({
  canManage,
  comment,
  editingBody,
  isEditing,
  onDelete,
  onEdit,
  onEditingBodyChange,
  onSave,
  onStopEditing,
  saving,
}: Readonly<{
  canManage: boolean;
  comment: LeadComment;
  editingBody: string;
  isEditing: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onEditingBodyChange: (value: string) => void;
  onSave: () => void;
  onStopEditing: () => void;
  saving: boolean;
}>) {
  const authorLabel = comment.authorUserName || comment.authorUserId || "Unknown";

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
          {buildInitials(authorLabel)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{authorLabel}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatDateTime(comment.createdAt)}
              </p>
              {canManage ? (
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <button
                      aria-label="Cancel editing note"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      disabled={saving}
                      onClick={onStopEditing}
                      type="button"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      aria-label="Edit note"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      disabled={saving}
                      onClick={onEdit}
                      type="button"
                    >
                      <PencilLine aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    aria-label="Delete note"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                    disabled={saving}
                    onClick={onDelete}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-3 grid gap-3">
              <textarea
                className="min-h-24 rounded-2xl border border-[var(--border-default)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-sky-400"
                onChange={(event) => onEditingBodyChange(event.target.value)}
                value={editingBody}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
                  disabled={saving}
                  onClick={onStopEditing}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  disabled={saving || !editingBody.trim()}
                  onClick={onSave}
                  type="button"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
              {comment.body}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function buildInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
