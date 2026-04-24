"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";

function subscribe() {
  return () => {};
}
function getClientSnapshot() {
  return /mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
}
function getServerSnapshot() {
  return "⌘";
}

export function SearchCommand() {
  const modKey = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return (
    <button
      aria-label="Search"
      className="group inline-flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm text-[var(--text-tertiary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] md:min-w-[240px] lg:min-w-[320px]"
      type="button"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="flex-1 text-left">Search or ask AI…</span>
      <kbd className="hidden rounded-md border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--text-tertiary)] sm:inline-flex">
        {modKey} K
      </kbd>
    </button>
  );
}
