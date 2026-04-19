"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { hasCompanyPermissionInAccess } from "@/lib/auth/access-control";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { CRMClientError, listCompanies, type Company } from "@/lib/crm/client";

type OwnerCompany = {
  companyId: string;
  companyName: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (company: OwnerCompany) => void;
  account: AccountProfile | null;
};

/**
 * Modal that lists companies the operator can manage integrations on:
 * owners (per integrations.manage in Faz 0.1) and super admins (no scope).
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

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
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

  const manageableCompanies = useMemo<OwnerCompany[]>(() => {
    if (!account) return [];
    return companies
      .filter((c) =>
        hasCompanyPermissionInAccess(account.access, c.id, "integrations.manage"),
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="company-picker-title" className="text-lg font-semibold tracking-tight text-slate-950">
          Select a company
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Integrations are configured per company. Choose the company you want to manage.
        </p>

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading companies…
          </div>
        ) : errorMessage ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : manageableCompanies.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            You don&apos;t own any companies yet. Create one from the{" "}
            <span className="font-semibold">Companies</span> page first.
          </div>
        ) : (
          <ul className="mt-6 grid gap-2" role="listbox" aria-label="Manageable companies">
            {manageableCompanies.map((c, idx) => (
              <li key={c.companyId}>
                <button
                  ref={idx === 0 ? firstFocusable : null}
                  type="button"
                  onClick={() => onSelect(c)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-cyan-400 hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                >
                  {c.companyName}
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {c.companyId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
