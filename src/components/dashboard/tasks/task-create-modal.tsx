"use client";

import { useTranslations } from "next-intl";

import type { CompanyMember } from "@/lib/auth/company-membership-client";

import { LeadModalFrame } from "@/components/dashboard/leads/lead-modal-frame";

type TaskCreateModalProps = {
  title: string;
  note: string;
  dueDate: string;
  assignmentMode: "individual" | "everyone";
  assigneeUserId: string;
  members: CompanyMember[];
  saving: boolean;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onAssignmentModeChange: (value: "individual" | "everyone") => void;
  onAssigneeUserIdChange: (value: string) => void;
  onCreate: () => void;
};

export function TaskCreateModal({
  title,
  note,
  dueDate,
  assignmentMode,
  assigneeUserId,
  members,
  saving,
  onClose,
  onTitleChange,
  onNoteChange,
  onDueDateChange,
  onAssignmentModeChange,
  onAssigneeUserIdChange,
  onCreate,
}: Readonly<TaskCreateModalProps>) {
  const t = useTranslations();
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            {t("tasks.modal.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {t("tasks.modal.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            {t("tasks.modal.subtitle")}
          </p>
        </div>
        <button
          className="shrink-0 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:px-5 sm:py-3"
          onClick={onClose}
          type="button"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t("tasks.fields.title")}</span>
          <input
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t("tasks.placeholders.title")}
            value={title}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t("tasks.fields.assignmentMode")}</span>
          <select
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            onChange={(event) =>
              onAssignmentModeChange(event.target.value as "individual" | "everyone")
            }
            value={assignmentMode}
          >
            <option value="individual">{t("tasks.assignmentMode.individual")}</option>
            <option value="everyone">{t("tasks.assignmentMode.everyone")}</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t("tasks.fields.dueDate")}</span>
          <input
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            onChange={(event) => onDueDateChange(event.target.value)}
            type="date"
            value={dueDate}
          />
        </label>

        {assignmentMode === "individual" ? (
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{t("tasks.fields.assignee")}</span>
            <select
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              onChange={(event) => onAssigneeUserIdChange(event.target.value)}
              value={assigneeUserId}
            >
              <option value="">{t("tasks.placeholders.assignee")}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName || member.email}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)] md:col-span-2">
            {t("tasks.modal.broadcastNote")}
          </div>
        )}

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t("tasks.fields.notes")}</span>
          <textarea
            className="min-h-[150px] rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder={t("tasks.placeholders.notes")}
            value={note}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          className="w-full rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
          disabled={saving}
          onClick={onCreate}
          type="button"
        >
          {saving ? t("tasks.actions.publishing") : t("tasks.actions.publish")}
        </button>
        <button
          className="w-full rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:w-auto"
          onClick={onClose}
          type="button"
        >
          {t("common.cancel")}
        </button>
      </div>
    </LeadModalFrame>
  );
}
