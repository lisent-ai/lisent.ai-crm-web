"use client";

import { useTranslations } from "next-intl";

import type { MetaPage } from "@/lib/crm/client";

type MetaPagePickerProps = {
  pages: MetaPage[];
  selected: string;
  onSelect: (pageId: string) => void;
};

// MetaPagePicker is a radio list of Pages the operator owns. Renders
// inline in the connect modal — no separate dropdown — so the Page name +
// category are visible at a glance and one-click selectable.
export function MetaPagePicker({
  pages,
  selected,
  onSelect,
}: Readonly<MetaPagePickerProps>) {
  const t = useTranslations();
  if (pages.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        {t("integrations.meta.pagePickerEmpty")}
      </p>
    );
  }
  return (
    <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
      {pages.map((p) => {
        const active = p.id === selected;
        return (
          <li key={p.id}>
            <button
              aria-pressed={active}
              className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
              onClick={() => onSelect(p.id)}
              type="button"
            >
              <span className="flex flex-col">
                <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                <span className="font-mono text-xs text-[var(--text-tertiary)]">{p.id}</span>
              </span>
              {p.category && (
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {p.category}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
