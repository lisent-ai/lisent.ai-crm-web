"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

import { CRMClientError, deleteCompany } from "@/lib/crm/client";

type DeleteWorkspaceModalProps = {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onDeleted: (deletedCompanyId: string) => void;
};

export function DeleteWorkspaceModal({
  companyId,
  companyName,
  onClose,
  onDeleted,
}: Readonly<DeleteWorkspaceModalProps>) {
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, saving]);

  const confirmValid = confirmText.trim() === companyName.trim();

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmValid || saving) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await deleteCompany(companyId);
      onDeleted(companyId);
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError
          ? error.message
          : "Failed to delete workspace.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(11,15,25,0.45)] px-4 py-8 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-auto w-full max-w-md rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] text-[var(--signal-red)]"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Delete workspace
              </h2>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                This permanently removes{" "}
                <span className="font-medium text-[var(--text-secondary)]">
                  {companyName || "this workspace"}
                </span>{" "}
                and its leads, deals, customers and members. This cannot be
                undone.
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleDelete}>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              Type{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {companyName}
              </span>{" "}
              to confirm
            </span>
            <input
              autoFocus
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]"
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={companyName}
              type="text"
              value={confirmText}
            />
          </label>

          {errorMessage && (
            <p className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-2 text-sm text-[var(--signal-red)]">
              {errorMessage}
            </p>
          )}

          <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--signal-red)] px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={!confirmValid || saving}
              type="submit"
            >
              {saving ? "Deleting…" : "Delete workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
