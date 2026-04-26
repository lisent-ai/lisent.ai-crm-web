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
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--signal-red)]">
          Delete deal
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Remove {deal.name || "this deal"}?
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          This will permanently remove the deal record and its stage history. Related
          customer and lead records will stay untouched.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[var(--signal-red)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            disabled={saving}
            onClick={onConfirm}
            type="button"
          >
            {saving ? "Deleting..." : "Delete deal"}
          </button>
          <button
            className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
