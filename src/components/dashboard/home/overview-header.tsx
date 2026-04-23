"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";

type OverviewHeaderProps = {
  subtitle?: string;
};

export function OverviewHeader({ subtitle }: Readonly<OverviewHeaderProps>) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          Overview
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          type="button"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Customize
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          type="button"
        >
          This week
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
