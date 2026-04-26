import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            {t("leads.bulkAssign.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {t("leads.bulkAssign.title", { count })}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t("leads.bulkAssign.description")}
          </p>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          onClick={onClose}
          type="button"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-6">
        <SelectField
          label={t("leads.bulkAssign.assignTo")}
          onChange={onAssigneeChange}
          options={[
            { label: t("leads.bulkAssign.selectTeammate"), value: "" },
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
          {saving
            ? t("leads.bulkAssign.assigning")
            : t("leads.bulkAssign.assignCta", { count })}
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
