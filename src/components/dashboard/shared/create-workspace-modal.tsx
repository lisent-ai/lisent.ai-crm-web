"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { CRMClientError, type Company, createCompany } from "@/lib/crm/client";

type CreateWorkspaceModalProps = {
  onClose: () => void;
  onCreated: (company: Company) => void;
};

export function CreateWorkspaceModal({
  onClose,
  onCreated,
}: Readonly<CreateWorkspaceModalProps>) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const created = await createCompany({
        name: name.trim(),
        country: country.trim(),
        industry: industry.trim(),
      });
      onCreated(created);
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError
          ? error.message
          : "Failed to create workspace.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,15,25,0.45)] px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Create workspace
            </h2>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              A workspace is its own environment with isolated leads, deals and customers.
            </p>
          </div>
          <button
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <Field
            autoFocus
            label="Workspace name"
            onChange={setName}
            placeholder="Example: Nova Health"
            required
            value={name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Country"
              onChange={setCountry}
              placeholder="TR, US, DE…"
              value={country}
            />
            <Field
              label="Industry"
              onChange={setIndustry}
              placeholder="SaaS, Healthcare…"
              value={industry}
            />
          </div>

          {errorMessage && (
            <p className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-2 text-sm text-[var(--signal-red)]">
              {errorMessage}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              className="inline-flex h-9 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              disabled={saving || !name.trim()}
              type="submit"
            >
              {saving ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
}: Readonly<FieldProps>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {label}
      </span>
      <input
        autoFocus={autoFocus}
        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
    </label>
  );
}

export const OPEN_CREATE_WORKSPACE_EVENT = "lisent:open-create-workspace";

export function requestCreateWorkspace() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_CREATE_WORKSPACE_EVENT));
}
