"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { MetaForm } from "@/lib/crm/client";

// See meta-page-picker.tsx for the rationale — duplicated here to keep
// each picker self-contained.
// `t` is wrapped this way (instead of `as never`) because TS2589's deep
// instantiation triggers when the wrapper itself goes through next-intl's
// generic — by retyping `t` to a plain `(key, vars) => string` here we
// stop the resolver before it expands the keys union.
function tx(
  t: ReturnType<typeof useTranslations>,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const plain = t as unknown as (
    k: string,
    v?: Record<string, string | number>,
  ) => string;
  return plain(key, vars);
}

type MetaFormPickerProps = {
  forms: MetaForm[];
  selected: Set<string>;
  onToggle: (formId: string) => void;
  onSelectAll: (ids: string[]) => void;
  onSelectNone: () => void;
};

type SortKey = "trend" | "totalLeads" | "name" | "status";

// MetaFormPicker is a multi-select row list (not chips — chips break
// down at 20+ forms). Tier 1: status pill + trend per row. Tier 2:
// search + sort + select-all/none. Tier 3: empty-state SVG + keyboard
// navigation (Space toggles row).
//
// Empty selection means "subscribe to all forms" (Meta's default).
// We render a one-time hint banner when nothing is selected so the
// operator knows that's the intentional all-forms state, not a UX bug.
export function MetaFormPicker({
  forms,
  selected,
  onToggle,
  onSelectAll,
  onSelectNone,
}: Readonly<MetaFormPickerProps>) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("trend");
  const listRef = useRef<HTMLUListElement>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = forms;
    if (q) {
      list = forms.filter(
        (f) =>
          (f.name ?? "").toLowerCase().includes(q) ||
          f.id.includes(q) ||
          (f.status ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (a.name ?? "").localeCompare(b.name ?? "");
        case "totalLeads":
          return (b.leads_count ?? 0) - (a.leads_count ?? 0);
        case "status":
          return (a.status ?? "").localeCompare(b.status ?? "");
        case "trend":
        default:
          return (b.last_7d_leads ?? 0) - (a.last_7d_leads ?? 0);
      }
    });
  }, [forms, query, sortKey]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((idx) =>
        idx < filtered.length - 1 ? idx + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((idx) =>
        idx > 0 ? idx - 1 : filtered.length - 1,
      );
    } else if ((e.key === " " || e.key === "Enter") && focusedIdx >= 0) {
      e.preventDefault();
      onToggle(filtered[focusedIdx].id);
    }
  }

  if (forms.length === 0) {
    return <FormPickerEmpty t={t} />;
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((f) => selected.has(f.id));

  return (
    <div className="flex flex-col gap-3">
      {selected.size === 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent-strong)]">
          {tx(t, "integrations.meta.formAllSubscribedHint")}
        </div>
      )}

      {/* Tier 2: search + sort + bulk select. Always visible when 3+
          forms — sub-3 doesn't benefit from controls. */}
      {forms.length >= 3 && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            onChange={setQuery}
            placeholder={tx(t, "integrations.meta.formPickerSearch")}
            value={query}
          />
          <SortSelect
            onChange={(v) => setSortKey(v as SortKey)}
            options={[
              { value: "trend", label: tx(t, "integrations.meta.sortTrend") },
              { value: "totalLeads", label: tx(t, "integrations.meta.sortTotalLeads") },
              { value: "status", label: tx(t, "integrations.meta.sortStatus") },
              { value: "name", label: tx(t, "integrations.meta.sortName") },
            ]}
            value={sortKey}
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-full border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              onClick={() =>
                allVisibleSelected
                  ? onSelectNone()
                  : onSelectAll(filtered.map((f) => f.id))
              }
              type="button"
            >
              {allVisibleSelected
                ? tx(t, "integrations.meta.selectNone")
                : tx(t, "integrations.meta.selectAll")}
            </button>
            <span className="text-xs text-[var(--text-tertiary)]">
              {tx(t, "integrations.meta.formsShownCount", {
                shown: filtered.length,
                total: forms.length,
              })}
            </span>
          </div>
        </div>
      )}

      <ul
        aria-label={tx(t, "integrations.meta.formPickerTitle")}
        className="scrollbar-thin flex max-h-[50vh] flex-col gap-2 overflow-y-auto outline-none"
        onKeyDown={handleKeyDown}
        ref={listRef}
        tabIndex={0}
      >
        {filtered.map((f, idx) => (
          <FormRow
            focused={idx === focusedIdx}
            form={f}
            key={f.id}
            onToggle={onToggle}
            selected={selected.has(f.id)}
            t={t}
          />
        ))}
        {filtered.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {tx(t, "integrations.meta.searchNoResults")}
          </li>
        )}
      </ul>
    </div>
  );
}

function FormRow({
  form,
  selected,
  focused,
  onToggle,
  t,
}: Readonly<{
  form: MetaForm;
  selected: boolean;
  focused: boolean;
  onToggle: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}>) {
  const status = (form.status ?? "").toUpperCase();
  return (
    <li>
      <button
        aria-checked={selected}
        className={`group flex w-full items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm transition-all duration-150 ${
          selected
            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-xs)]"
            : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
        } ${focused ? "ring-2 ring-[var(--accent)] ring-offset-1" : ""}`}
        onClick={() => onToggle(form.id)}
        role="checkbox"
        type="button"
      >
        <Checkbox checked={selected} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-[var(--text-primary)]">
              {form.name || form.id}
            </span>
            <FormStatusPill status={status} t={t} />
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            {form.leads_count != null && (
              <span>
                {tx(t, "integrations.meta.totalLeadsCount", { count: form.leads_count })}
              </span>
            )}
            {form.leads_count != null && form.last_7d_leads != null && <span>·</span>}
            <span className={form.last_7d_leads > 0 ? "font-medium text-[var(--signal-green)]" : ""}>
              {tx(t, "integrations.meta.last7dCount", { count: form.last_7d_leads })}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}

function Checkbox({ checked }: Readonly<{ checked: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
        checked
          ? "border-[var(--accent)] bg-[var(--accent)]"
          : "border-[var(--border-strong)] bg-[var(--surface)]"
      }`}
    >
      {checked && (
        <svg
          fill="none"
          height="10"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          viewBox="0 0 24 24"
          width="10"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

function FormStatusPill({
  status,
  t,
}: Readonly<{
  status: string;
  t: ReturnType<typeof useTranslations>;
}>) {
  // Meta returns ACTIVE / PAUSED / ARCHIVED / DELETED / DRAFT.
  // Map onto our design tokens with high-contrast colors that read at
  // a glance even on cards with the accent-soft background.
  const config = {
    ACTIVE: {
      label: tx(t, "integrations.meta.statusActive"),
      cls: "bg-[#dcfce7] text-[#166534]",
      dot: "bg-[var(--signal-green)]",
    },
    PAUSED: {
      label: tx(t, "integrations.meta.statusPaused"),
      cls: "bg-[#fef3c7] text-[#92400e]",
      dot: "bg-[var(--signal-amber)]",
    },
    ARCHIVED: {
      label: tx(t, "integrations.meta.statusArchived"),
      cls: "bg-[var(--surface-muted)] text-[var(--text-tertiary)]",
      dot: "bg-[var(--text-tertiary)]",
    },
    DELETED: {
      label: tx(t, "integrations.meta.statusDeleted"),
      cls: "bg-[#fee2e2] text-[#b91c1c]",
      dot: "bg-[var(--signal-red)]",
    },
    DRAFT: {
      label: tx(t, "integrations.meta.statusDraft"),
      cls: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
      dot: "bg-[var(--accent)]",
    },
  } as const;
  const cfg = (config as Record<string, (typeof config)[keyof typeof config]>)[
    status
  ] ?? {
    label: status || tx(t, "integrations.meta.statusUnknown"),
    cls: "bg-[var(--surface-muted)] text-[var(--text-tertiary)]",
    dot: "bg-[var(--text-tertiary)]",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}>) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
      >
        🔍
      </span>
      <input
        className="w-full rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  );
}

function SortSelect({
  value,
  onChange,
  options,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}>) {
  return (
    <select
      className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function FormPickerEmpty({
  t,
}: Readonly<{ t: ReturnType<typeof useTranslations> }>) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-8 text-center">
      <svg
        aria-hidden="true"
        className="h-12 w-12 text-[var(--text-tertiary)]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        viewBox="0 0 24 24"
      >
        <path
          d="M9 5h11M9 12h11M9 19h11M5 5h.01M5 12h.01M5 19h.01"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {tx(t, "integrations.meta.formPickerEmptyTitle")}
      </p>
      <p className="max-w-xs text-xs text-[var(--text-tertiary)]">
        {tx(t, "integrations.meta.formPickerEmpty")}
      </p>
    </div>
  );
}
