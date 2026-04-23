import type { CompanyMember } from "@/lib/auth/company-membership-client";

import { SelectField } from "./lead-form-fields";
import { LeadModalFrame } from "./lead-modal-frame";

type LeadBulkAssignModalProps = {
  assigneeUserId: string;
  assignableMembers: CompanyMember[];
  count: number;
  onAssigneeChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
};

export function LeadBulkAssignModal({
  assigneeUserId,
  assignableMembers,
  count,
  onAssigneeChange,
  onClose,
  onConfirm,
  saving,
}: Readonly<LeadBulkAssignModalProps>) {
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Bulk assignment
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Assign {count} selected lead{count === 1 ? "" : "s"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Choose one teammate and we&apos;ll apply a manual assignment to every
            selected lead.
          </p>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="mt-6">
        <SelectField
          label="Assign to"
          onChange={onAssigneeChange}
          options={[
            { label: "Select teammate", value: "" },
            ...assignableMembers.map((member) => ({
              label: member.displayName,
              value: member.userId,
            })),
          ]}
          value={assigneeUserId}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={saving || !assigneeUserId.trim()}
          onClick={onConfirm}
          type="button"
        >
          {saving ? "Assigning..." : `Assign ${count} lead${count === 1 ? "" : "s"}`}
        </button>
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          disabled={saving}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>
    </LeadModalFrame>
  );
}
