import type { Deal } from "@/lib/crm/client";

import { DealModalFrame } from "./deal-modal-frame";

type DealDeleteModalProps = {
  deal: Deal;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DealDeleteModal({
  deal,
  saving,
  onClose,
  onConfirm,
}: Readonly<DealDeleteModalProps>) {
  return (
    <DealModalFrame onClose={onClose}>
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700/80">
          Delete deal
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Remove {deal.name || "this deal"}?
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          This will permanently remove the deal record and its stage history. Related
          customer and lead records will stay untouched.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? "Deleting..." : "Delete deal"}
          </button>
          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </DealModalFrame>
  );
}
