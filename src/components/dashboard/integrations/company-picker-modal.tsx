"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { hasCompanyPermissionInAccess } from "@/lib/auth/access-control";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { CRMClientError, listCompanies, type Company } from "@/lib/crm/client";

type ViewableCompany = {
  companyId: string;
  companyName: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (company: ViewableCompany) => void;
  account: AccountProfile | null;
};

/**
 * Modal that lists companies whose integrations the operator can at least
 * view. Owners get full management; admins/members get read-only access so
 * they can see connection status and AI features pick up the owner's setup.
 */
export function CompanyPickerModal({
  isOpen,
  onClose,
  onSelect,
  account,
}: Readonly<Props>) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFocusable = useRef<HTMLButtonElement | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Render-time reset whenever the modal transitions to open. Avoids
  // synchronous setState inside useEffect (react-hooks/set-state-in-effect).
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCompanies([]);
      setErrorMessage(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listCompanies()
      .then((list) => {
        if (!cancelled) setCompanies(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof CRMClientError
            ? err.message
            : "Could not load companies",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const viewableCompanies = useMemo<ViewableCompany[]>(() => {
    if (!account) return [];
    return companies
      .filter((c) =>
        hasCompanyPermissionInAccess(account.access, c.id, "integrations.read"),
      )
      .map((c) => ({ companyId: c.id, companyName: c.name || c.id }));
  }, [companies, account]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeydown);
    firstFocusable.current?.focus();
    return () => document.removeEventListener("keydown", onKeydown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,15,25,0.5)] px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="company-picker-title" className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          Select a company
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Integrations live per company. Pick the workspace whose connections
          you want to inspect.
        </p>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
              Loading companies…
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] p-4 text-sm text-[var(--signal-red)]">
              {errorMessage}
            </div>
          ) : viewableCompanies.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
              You don&apos;t belong to any companies yet. Create one from the{" "}
              <span className="font-semibold text-[var(--text-primary)]">Companies</span> page,
              or ask an owner to invite you.
            </div>
          ) : (
            <ul className="grid gap-2" role="listbox" aria-label="Viewable companies">
              {viewableCompanies.map((c, idx) => (
                <li key={c.companyId}>
                  <button
                    ref={idx === 0 ? firstFocusable : null}
                    type="button"
                    onClick={() => onSelect(c)}
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    <span className="block truncate">{c.companyName}</span>
                    <span className="mt-1 block break-all text-xs font-normal text-[var(--text-tertiary)]">
                      {c.companyId}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
