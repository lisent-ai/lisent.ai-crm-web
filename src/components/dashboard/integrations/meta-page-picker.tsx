"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { MetaPage } from "@/lib/crm/client";

// next-intl's strict types choke on the deeply-nested en.json schema for
// our newly-added keys until Next.js regenerates the message-keys union
// (happens on `next build`). Until then this wrapper lets us call t()
// with the new keys without TS2589 deep-instantiation errors. Keep this
// pattern consistent with meta-form-picker — one shape, two files.
// Same wrapper as meta-form-picker — see comment there for the TS2589
// rationale. Keeping the helper local to each picker so the file stays
// self-contained.
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

type MetaPagePickerProps = {
  pages: MetaPage[];
  selected: string;
  onSelect: (pageId: string) => void;
};

type SortKey = "lastLead" | "name" | "followers";

// MetaPagePicker is the page-picker view inside the Connect modal.
//
// Tier 1: avatar + follower count + "Connected" badge + last-lead-time
// label. Tier 2: search + sort. Tier 3: empty-state SVG + keyboard
// navigation (↑↓ Enter Space) + smooth selection transitions.
//
// Designed for thousands-of-pages worst case but stays useful at 1
// page (the row layout is the same — search/sort just hide).
export function MetaPagePicker({
  pages,
  selected,
  onSelect,
}: Readonly<MetaPagePickerProps>) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastLead");
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pages;
    if (q) {
      list = pages.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "followers":
          return (b.followers_count ?? 0) - (a.followers_count ?? 0);
        case "lastLead":
        default: {
          // Pages that received leads recently bubble up; pages with
          // no lead history sort to the bottom.
          const aT = a.last_lead_at ? Date.parse(a.last_lead_at) : 0;
          const bT = b.last_lead_at ? Date.parse(b.last_lead_at) : 0;
          if (aT !== bT) return bT - aT;
          // Fall back to follower count so popular pages still rank.
          return (b.followers_count ?? 0) - (a.followers_count ?? 0);
        }
      }
    });
  }, [pages, query, sortKey]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (filtered.length === 0) return;
    const currentIdx = filtered.findIndex((p) => p.id === selected);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentIdx < filtered.length - 1 ? currentIdx + 1 : 0;
      onSelect(filtered[next].id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = currentIdx > 0 ? currentIdx - 1 : filtered.length - 1;
      onSelect(filtered[next].id);
    }
  }

  if (pages.length === 0) {
    return <PagePickerEmpty t={t} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Tier 2 controls — only when 5+ pages, otherwise just clutter. */}
      {pages.length >= 5 && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            onChange={setQuery}
            placeholder={tx(t, "integrations.meta.pagePickerSearch")}
            value={query}
          />
          <SortSelect
            onChange={(v) => setSortKey(v as SortKey)}
            options={[
              { value: "lastLead", label: tx(t, "integrations.meta.sortLastLead") },
              { value: "followers", label: tx(t, "integrations.meta.sortFollowers") },
              { value: "name", label: tx(t, "integrations.meta.sortName") },
            ]}
            value={sortKey}
          />
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">
            {tx(t, "integrations.meta.pagesShownCount", {
              shown: filtered.length,
              total: pages.length,
            })}
          </span>
        </div>
      )}

      <ul
        aria-label={tx(t, "integrations.meta.pagePickerTitle")}
        className="scrollbar-thin flex max-h-[50vh] flex-col gap-2 overflow-y-auto outline-none"
        onKeyDown={handleKeyDown}
        ref={listRef}
        role="radiogroup"
        tabIndex={0}
      >
        {filtered.map((p) => (
          <PageRow
            key={p.id}
            onSelect={onSelect}
            page={p}
            selected={p.id === selected}
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

function PageRow({
  page,
  selected,
  onSelect,
  t,
}: Readonly<{
  page: MetaPage;
  selected: boolean;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <li>
      <button
        aria-checked={selected}
        className={`group flex w-full items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm transition-all duration-150 ${
          selected
            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-xs)]"
            : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
        }`}
        onClick={() => onSelect(page.id)}
        role="radio"
        type="button"
      >
        <PageAvatar name={page.name} url={page.picture_url} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-[var(--text-primary)]">
              {page.name}
            </span>
            {page.is_connected && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-green)]" />
                {tx(t, "integrations.meta.pageConnectedBadge")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            {page.category && <span className="truncate">{page.category}</span>}
            {page.followers_count != null && page.followers_count > 0 && (
              <>
                <span>·</span>
                <span>
                  {tx(t, "integrations.meta.followersCount", {
                    count: formatCount(page.followers_count),
                  })}
                </span>
              </>
            )}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            {page.last_lead_at ? (
              <>
                <span className="font-medium text-[var(--text-secondary)]">
                  {tx(t, "integrations.meta.lastLeadAgo", {
                    when: formatRelative(page.last_lead_at, t),
                  })}
                </span>
                {page.last_7d_leads > 0 && (
                  <span> · {tx(t, "integrations.meta.leads7d", { count: page.last_7d_leads })}</span>
                )}
              </>
            ) : (
              <span>{tx(t, "integrations.meta.noLeadsYet")}</span>
            )}
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`shrink-0 text-[var(--accent-strong)] transition-opacity ${
            selected ? "opacity-100" : "opacity-0"
          }`}
        >
          ✓
        </span>
      </button>
    </li>
  );
}

function PageAvatar({ name, url }: Readonly<{ name: string; url?: string }>) {
  const initial = name.charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-[var(--border-subtle)] object-cover"
        loading="lazy"
        src={url}
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
      {initial}
    </div>
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

function PagePickerEmpty({
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
          d="M5 4.5a2 2 0 012-2h10a2 2 0 012 2v15l-7-3-7 3v-15z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {tx(t, "integrations.meta.pagePickerEmptyTitle")}
      </p>
      <p className="max-w-xs text-xs text-[var(--text-tertiary)]">
        {tx(t, "integrations.meta.pagePickerEmpty")}
      </p>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelative(
  iso: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return "now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return tx(t, "integrations.meta.timeJustNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return tx(t, "integrations.meta.timeMinutes", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return tx(t, "integrations.meta.timeHours", { count: hr });
  const days = Math.floor(hr / 24);
  if (days < 30) return tx(t, "integrations.meta.timeDays", { count: days });
  const months = Math.floor(days / 30);
  return tx(t, "integrations.meta.timeMonths", { count: months });
}
