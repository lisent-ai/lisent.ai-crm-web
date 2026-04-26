"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Filter, Plus, Search, X } from "lucide-react";

type SelectOption = {
  label: string;
  value: string;
};

type LeadToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceChange: (value: string) => void;
  sourceOptions: SelectOption[];
  assigneeFilter: string;
  onAssigneeChange: (value: string) => void;
  assigneeOptions: SelectOption[];
  showOnlyUnassigned: boolean;
  onShowUnassignedChange: (value: boolean) => void;
  onAdd: () => void;
  canAdd: boolean;
};

export function LeadToolbar({
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceChange,
  sourceOptions,
  assigneeFilter,
  onAssigneeChange,
  assigneeOptions,
  showOnlyUnassigned,
  onShowUnassignedChange,
  onAdd,
  canAdd,
}: Readonly<LeadToolbarProps>) {
  const t = useTranslations();
  const [filterOpen, setFilterOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onPointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const activeFilterCount =
    (sourceFilter !== "all" ? 1 : 0) +
    (assigneeFilter !== "all" ? 1 : 0) +
    (showOnlyUnassigned ? 1 : 0);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
        />
        <input
          aria-label={t("leads.toolbar.searchAria")}
          className="h-10 w-full rounded-full border border-[var(--border-default)] bg-[var(--surface)] pl-9 pr-9 text-sm text-[var(--text-primary)] transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus:outline-none"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("leads.toolbar.searchPlaceholder")}
          type="search"
          value={searchQuery}
        />
        {searchQuery ? (
          <button
            aria-label={t("leads.toolbar.clearSearch")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={containerRef}>
          <button
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            onClick={() => setFilterOpen((prev) => !prev)}
            type="button"
          >
            <Filter aria-hidden="true" className="h-4 w-4" />
            {t("leads.toolbar.filter")}
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] font-semibold text-[var(--accent-strong)]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          {filterOpen && (
            <div
              className="fixed inset-x-3 top-[140px] z-30 mx-auto w-auto max-w-[340px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[var(--shadow-float)] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mx-0 sm:mt-2 sm:w-[280px] sm:max-w-[calc(100vw-2rem)]"
              role="menu"
            >
              <FilterSelect
                label={t("leads.toolbar.source")}
                onChange={onSourceChange}
                options={sourceOptions}
                value={sourceFilter}
              />
              <div className="mt-3">
                <FilterSelect
                  label={t("leads.toolbar.assignee")}
                  onChange={onAssigneeChange}
                  options={assigneeOptions}
                  value={assigneeFilter}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                <input
                  checked={showOnlyUnassigned}
                  className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
                  onChange={(event) => onShowUnassignedChange(event.target.checked)}
                  type="checkbox"
                />
                {t("leads.toolbar.showOnlyUnassigned")}
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
                  onClick={() => {
                    onSourceChange("all");
                    onAssigneeChange("all");
                    onShowUnassignedChange(false);
                  }}
                  type="button"
                >
                  {t("leads.toolbar.clear")}
                </button>
                <button
                  className="rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                  onClick={() => setFilterOpen(false)}
                  type="button"
                >
                  {t("leads.toolbar.apply")}
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          disabled={!canAdd}
          onClick={onAdd}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">{t("leads.toolbar.addLead")}</span>
          <span className="sm:hidden">{t("leads.toolbar.add")}</span>
        </button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: Readonly<{
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </span>
      <select
        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
