"use client";

import type { ReactNode } from "react";

type WizardFieldProps = {
  // What the field is asking for, in plain words.
  label: string;
  // Brief explainer under the label — why this matters, where it shows
  // up later. Keep it under 100 chars.
  help?: string;
  // Optional example value to anchor expectations.
  example?: string;
  // True when the operator MUST fill this to advance.
  required?: boolean;
  // The actual <input>/<select>/<textarea>.
  children: ReactNode;
};

// WizardField wraps each input inside a wizard step with consistent
// structure:
//   Label *             ← line 1, bigger text
//   help text           ← line 2, smaller secondary text
//   <input>             ← line 3, the actual control
//   Example: …          ← line 4, smaller tertiary text (optional)
//
// Standard structure across every wizard so operators learn the
// pattern once and never get lost. Required marker is purely visual;
// validation lives in the step's isValid closure.
export function WizardField({
  label,
  help,
  example,
  required,
  children,
}: Readonly<WizardFieldProps>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {label}
        {required ? <span className="ml-1 text-[var(--signal-red)]">*</span> : null}
      </span>
      {help ? (
        <span className="text-xs text-[var(--text-secondary)]">{help}</span>
      ) : null}
      {children}
      {example ? (
        <span className="text-xs text-[var(--text-tertiary)]">
          {`Example: ${example}`}
        </span>
      ) : null}
    </label>
  );
}
