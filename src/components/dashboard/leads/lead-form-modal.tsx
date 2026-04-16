import type { CompanyMember } from "@/lib/auth/company-membership-client";
import { Field } from "@/components/dashboard/customers/customer-ui";

import { SelectField, TextAreaField } from "./lead-form-fields";
import { LeadModalFrame } from "./lead-modal-frame";
import type { LeadFormState } from "./lead-types";
import { leadStatuses } from "./lead-types";

type LeadFormModalProps = {
  editingLeadId: string | null;
  leadForm: LeadFormState;
  assignableMembers: CompanyMember[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onLeadFormChange: (updater: (current: LeadFormState) => LeadFormState) => void;
};

export function LeadFormModal({
  editingLeadId,
  leadForm,
  assignableMembers,
  saving,
  onClose,
  onSave,
  onLeadFormChange,
}: Readonly<LeadFormModalProps>) {
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            {editingLeadId ? "Edit lead" : "New lead"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {editingLeadId ? "Update lead details" : "Capture a new lead"}
          </h2>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label="Lead name"
          onChange={(value) => onLeadFormChange((current) => ({ ...current, name: value }))}
          placeholder="Jane Doe"
          value={leadForm.name}
        />
        <Field
          label="Lead source"
          onChange={(value) => onLeadFormChange((current) => ({ ...current, source: value }))}
          placeholder="Meta Ads"
          value={leadForm.source}
        />
        <Field
          label="Email"
          onChange={(value) => onLeadFormChange((current) => ({ ...current, email: value }))}
          placeholder="jane@example.com"
          value={leadForm.email}
        />
        <Field
          label="Phone"
          onChange={(value) => onLeadFormChange((current) => ({ ...current, phone: value }))}
          placeholder="+49 170 000 0000"
          value={leadForm.phone}
        />
        <SelectField
          label="Pipeline stage"
          onChange={(value) =>
            onLeadFormChange((current) => ({
              ...current,
              status: value as LeadFormState["status"],
            }))
          }
          options={leadStatuses.map((status) => ({ label: status, value: status }))}
          value={leadForm.status}
        />
        <Field
          label="Lead value"
          onChange={(value) => onLeadFormChange((current) => ({ ...current, value }))}
          placeholder="5000"
          value={leadForm.value}
        />
        <SelectField
          label="Assignment mode"
          onChange={(value) =>
            onLeadFormChange((current) => ({
              ...current,
              assignmentMethod: value as LeadFormState["assignmentMethod"],
              ...(value === "round_robin"
                ? { assigneeUserId: "", assigneeUserName: "" }
                : {}),
            }))
          }
          options={[
            { label: "Manual", value: "manual" },
            { label: "Round robin", value: "round_robin" },
          ]}
          value={leadForm.assignmentMethod}
        />
        <SelectField
          label="Assignee"
          onChange={(value) => {
            const member = assignableMembers.find((item) => item.userId === value);
            onLeadFormChange((current) => ({
              ...current,
              assigneeUserId: value,
              assigneeUserName: member?.displayName ?? "",
            }));
          }}
          options={[
            { label: "Unassigned", value: "" },
            ...assignableMembers.map((member) => ({
              label: member.displayName,
              value: member.userId,
            })),
          ]}
          value={leadForm.assigneeUserId}
        />
      </div>

      <div className="mt-4">
        <TextAreaField
          label="Notes"
          onChange={(value) => onLeadFormChange((current) => ({ ...current, notes: value }))}
          placeholder="Context from the sales call, campaign notes, objections..."
          value={leadForm.notes}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          {saving ? "Saving..." : editingLeadId ? "Save changes" : "Create lead"}
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
