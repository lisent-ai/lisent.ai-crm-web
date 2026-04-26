"use client";

import { useTranslations } from "next-intl";

import type { Deal } from "@/lib/crm/client";

import {
  buildInitials,
  formatMoney,
  formatShortDate,
} from "./deal-utils";

type DealBoardCardProps = {
  deal: Deal;
  customerLabel: string;
  isSelected: boolean;
  onSelect: () => void;
};

export function DealBoardCard({
  deal,
  customerLabel,
  isSelected,
  onSelect,
}: Readonly<DealBoardCardProps>) {
  const t = useTranslations();
  const assigneeLabel = deal.assigneeUserName || t("deals.unassigned");
  const noDateLabel = t("deals.noDate");
  return (
    <button
      className={`rounded-[var(--radius-card-lg)] border bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
        isSelected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
          : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            #{deal.id.slice(0, 8)}
          </p>
          <p className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-[var(--text-primary)]">
            {deal.name || t("deals.untitledDeal")}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          {t("deals.commentsCount", { count: deal.comments.length })}
        </span>
      </div>

      <p className="mt-3 truncate text-sm text-[var(--text-tertiary)]">{customerLabel}</p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {t("deals.dealValue")}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {formatMoney(deal.amount, deal.currency)}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-xs)]">
              {buildInitials(assigneeLabel)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
            <p className="font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("deals.assignee")}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
              {assigneeLabel}
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2.5">
            <p className="font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t("deals.close")}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
              {formatShortDate(deal.closeDate, noDateLabel)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
