import { useTranslations } from "next-intl";

import type { Lead } from "@/lib/crm/client";

import { LeadModalFrame } from "./lead-modal-frame";
import { formatSourceLabel } from "./lead-utils";

type LeadArchiveModalProps = {
  lead: Lead;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

// Archive replaces the old destructive delete. Copy + colour intentionally
// signal a reversible action (an admin can restore from the archive) rather
// than permanent loss.
export function LeadArchiveModal({
  lead,
  saving,
  onClose,
  onConfirm,
}: Readonly<LeadArchiveModalProps>) {
  const t = useTranslations();
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            {t("leads.archiveModal.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {t("leads.archiveModal.title", { name: lead.name || t("leads.fallback.lead") })}
          </h2>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          disabled={saving}
          onClick={onClose}
          type="button"
        >
          {t("common.close")}
        </button>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-700">
        {t("leads.archiveModal.description")}
      </p>

      <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">
          {lead.name || t("leads.fallback.unnamedLead")}
        </p>
        <p className="mt-1 text-sm text-slate-600">{formatSourceLabel(lead.source)}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
          disabled={saving}
          onClick={onConfirm}
          type="button"
        >
          {saving ? t("leads.archiveModal.archiving") : t("leads.archiveModal.confirm")}
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
