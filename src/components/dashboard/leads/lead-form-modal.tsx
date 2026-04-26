import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            {editingLeadId ? t("leads.formModal.editEyebrow") : t("leads.formModal.newEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {editingLeadId ? t("leads.formModal.editTitle") : t("leads.formModal.newTitle")}
          </h2>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label={t("leads.formModal.leadName")}
          onChange={(value) => onLeadFormChange((current) => ({ ...current, name: value }))}
          placeholder={t("leads.formModal.leadNamePlaceholder")}
          value={leadForm.name}
        />
        <Field
          label={t("leads.formModal.leadSource")}
          onChange={(value) => onLeadFormChange((current) => ({ ...current, source: value }))}
          placeholder={t("leads.formModal.leadSourcePlaceholder")}
          value={leadForm.source}
        />
        <Field
          label={t("leads.formModal.email")}
          onChange={(value) => onLeadFormChange((current) => ({ ...current, email: value }))}
          placeholder={t("leads.formModal.emailPlaceholder")}
          value={leadForm.email}
        />
        <Field
          label={t("leads.formModal.phone")}
          onChange={(value) => onLeadFormChange((current) => ({ ...current, phone: value }))}
          placeholder={t("leads.formModal.phonePlaceholder")}
          value={leadForm.phone}
        />
        <SelectField
          label={t("leads.formModal.pipelineStage")}
          onChange={(value) =>
            onLeadFormChange((current) => ({
              ...current,
              status: value as LeadFormState["status"],
            }))
          }
          options={leadStatuses.map((status) => ({
            label: t(`leads.status.${status}`),
            value: status,
          }))}
          value={leadForm.status}
        />
        <Field
          label={t("leads.formModal.leadValue")}
          onChange={(value) => onLeadFormChange((current) => ({ ...current, value }))}
          placeholder={t("leads.formModal.leadValuePlaceholder")}
          value={leadForm.value}
        />
        <SelectField
          label={t("leads.formModal.assignmentMode")}
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
            { label: t("leads.assignment.manual"), value: "manual" },
            { label: t("leads.assignment.roundRobin"), value: "round_robin" },
          ]}
          value={leadForm.assignmentMethod}
        />
        <SelectField
          label={t("leads.formModal.assignee")}
          onChange={(value) => {
            const member = assignableMembers.find((item) => item.userId === value);
            onLeadFormChange((current) => ({
              ...current,
              assigneeUserId: value,
              assigneeUserName: member?.displayName ?? "",
            }));
          }}
          options={[
            { label: t("leads.assignment.unassigned"), value: "" },
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
          label={t("leads.formModal.notes")}
          onChange={(value) => onLeadFormChange((current) => ({ ...current, notes: value }))}
          placeholder={t("leads.formModal.notesPlaceholder")}
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
          {saving
            ? t("common.saving")
            : editingLeadId
              ? t("leads.formModal.saveChanges")
              : t("leads.formModal.createLead")}
        </button>
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          disabled={saving}
          onClick={onClose}
          type="button"
        >
          {t("common.cancel")}
        </button>
      </div>
    </LeadModalFrame>
  );
}
