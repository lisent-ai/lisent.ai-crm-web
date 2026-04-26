"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

type OverviewHeaderProps = {
  subtitle?: string;
};

export function OverviewHeader({ subtitle }: Readonly<OverviewHeaderProps>) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          {t("home.overview.title")}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--text-tertiary)] break-words">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:shrink-0">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          type="button"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{t("home.overview.customize")}</span>
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          type="button"
        >
          {t("home.overview.thisWeek")}
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
