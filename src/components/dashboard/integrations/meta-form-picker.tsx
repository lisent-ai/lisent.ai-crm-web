"use client";

import { useTranslations } from "next-intl";

import type { MetaForm } from "@/lib/crm/client";

type MetaFormPickerProps = {
  forms: MetaForm[];
  selected: Set<string>;
  onToggle: (formId: string) => void;
};

// MetaFormPicker is a multi-select chip list. Empty selection means
// "subscribe to all forms on this page" (Meta's default behavior — we
// just don't filter on n8n side).
export function MetaFormPicker({
  forms,
  selected,
  onToggle,
}: Readonly<MetaFormPickerProps>) {
  const t = useTranslations();
  if (forms.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        {t("integrations.meta.formPickerEmpty")}
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {forms.map((f) => {
        const active = selected.has(f.id);
        return (
          <li key={f.id}>
            <button
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
              onClick={() => onToggle(f.id)}
              type="button"
            >
              <span>{f.name || f.id}</span>
              {typeof f.leads_count === "number" && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  · {f.leads_count}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
