import type { Lead } from "@/lib/crm/client";

import { LeadModalFrame } from "./lead-modal-frame";
import { formatSourceLabel } from "./lead-utils";

type LeadDeleteModalProps = {
  lead: Lead;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LeadDeleteModal({
  lead,
  saving,
  onClose,
  onConfirm,
}: Readonly<LeadDeleteModalProps>) {
  return (
    <LeadModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">
            Delete lead
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Remove {lead.name || "lead"}
          </h2>
        </div>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          disabled={saving}
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-700">
        This permanently removes the selected lead from the pipeline. Customer and
        deal records created from other conversions will stay untouched.
      </p>

      <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">
          {lead.name || "Unnamed lead"}
        </p>
        <p className="mt-1 text-sm text-slate-600">{formatSourceLabel(lead.source)}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          disabled={saving}
          onClick={onConfirm}
          type="button"
        >
          {saving ? "Removing..." : "Confirm delete"}
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
