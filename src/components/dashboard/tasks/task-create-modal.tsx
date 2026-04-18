"use client";

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
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700/80">
            New task
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Publish a ticket
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Create a lightweight task for one teammate or publish it to everyone in
            the selected company.
          </p>
        </div>
        <button
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Task title</span>
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Follow up on proposal feedback"
            value={title}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Assignment mode</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
            onChange={(event) =>
              onAssignmentModeChange(event.target.value as "individual" | "everyone")
            }
            value={assignmentMode}
          >
            <option value="individual">Assign to one person</option>
            <option value="everyone">Publish to everyone</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Due date</span>
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
            onChange={(event) => onDueDateChange(event.target.value)}
            type="date"
            value={dueDate}
          />
        </label>

        {assignmentMode === "individual" ? (
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Assignee</span>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
              onChange={(event) => onAssigneeUserIdChange(event.target.value)}
              value={assigneeUserId}
            >
              <option value="">Select a teammate</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName || member.email}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600 md:col-span-2">
            This will create one task for each eligible teammate so every person can
            accept or reject their own copy.
          </div>
        )}

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea
            className="min-h-[150px] rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Context, handoff details, expected outcome..."
            value={note}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={saving}
          onClick={onCreate}
          type="button"
        >
          {saving ? "Publishing..." : "Publish task"}
        </button>
        <button
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>
    </LeadModalFrame>
  );
}
