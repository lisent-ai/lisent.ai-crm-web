type CustomerDeleteModalProps = {
  customerName: string;
  customerEmail: string;
  onConfirmDelete: () => void;
  onClose: () => void;
};

export function CustomerDeleteModal({
  customerName,
  customerEmail,
  onConfirmDelete,
  onClose,
}: Readonly<CustomerDeleteModalProps>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,_var(--text-primary)_35%,_transparent)] px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-[var(--radius-card-lg)] border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--signal-red)]">
              Delete customer
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Remove {customerName}
            </h2>
          </div>
          <button
            className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
          This will permanently remove the selected customer record from the CRM.
        </p>

        <div className="mt-5 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            Customer
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{customerName}</p>
          <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">
            {customerEmail || "No email available"}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[var(--signal-red)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-90"
            onClick={onConfirmDelete}
            type="button"
          >
            Confirm delete
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
    </div>
  );
}
