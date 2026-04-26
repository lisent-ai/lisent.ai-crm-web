type CustomerBulkDeleteModalProps = {
  count: number;
  onClose: () => void;
  onConfirmDelete: () => void;
  saving: boolean;
};

export function CustomerBulkDeleteModal({
  count,
  onClose,
  onConfirmDelete,
  saving,
}: Readonly<CustomerBulkDeleteModalProps>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,_var(--text-primary)_35%,_transparent)] px-0 pt-10 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[var(--radius-card-lg)] border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:rounded-[var(--radius-card-lg)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--signal-red)]">
              Delete customers
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Remove {count} selected customer{count === 1 ? "" : "s"}
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
          This will permanently remove the selected customer records from the CRM.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="w-full rounded-full bg-[var(--signal-red)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
            disabled={saving}
            onClick={onConfirmDelete}
            type="button"
          >
            {saving ? "Deleting..." : `Confirm delete ${count}`}
          </button>
          <button
            className="w-full rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50 sm:w-auto"
            disabled={saving}
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
