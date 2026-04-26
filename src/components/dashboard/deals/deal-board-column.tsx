"use client";

import { useTranslations } from "next-intl";

import type { Deal, DealStage } from "@/lib/crm/client";

import { formatMoney, stageBadgeClasses } from "./deal-utils";
import { DealBoardCard } from "./deal-board-card";

type DealBoardColumnProps = {
  stage: DealStage;
  stageLabel: string;
  stageDescription: string;
  deals: Deal[];
  selectedDealId: string | null;
  customerLabelById: Map<string, string>;
  onSelectDeal: (dealId: string) => void;
};

const stageDotClasses: Record<DealStage, string> = {
  new: "bg-[var(--signal-purple)]",
  qualified: "bg-[var(--signal-blue)]",
  proposal: "bg-[var(--signal-purple)]",
  negotiation: "bg-[var(--signal-amber)]",
  won: "bg-[var(--signal-green)]",
  lost: "bg-[var(--signal-red)]",
};

const stageShellClasses: Record<DealStage, string> = {
  new: "border-[color-mix(in_srgb,_var(--signal-purple)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-purple)_6%,_var(--surface))]",
  qualified:
    "border-[color-mix(in_srgb,_var(--accent)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--accent)_6%,_var(--surface))]",
  proposal:
    "border-[color-mix(in_srgb,_var(--signal-purple)_32%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-purple)_8%,_var(--surface))]",
  negotiation:
    "border-[color-mix(in_srgb,_var(--signal-amber)_32%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_8%,_var(--surface))]",
  won: "border-[color-mix(in_srgb,_var(--signal-green)_32%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))]",
  lost: "border-[color-mix(in_srgb,_var(--signal-red)_32%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))]",
};

export function DealBoardColumn({
  stage,
  stageLabel,
  stageDescription,
  deals,
  selectedDealId,
  customerLabelById,
  onSelectDeal,
}: Readonly<DealBoardColumnProps>) {
  const t = useTranslations();
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);
  const noCustomerLabel = t("deals.noRelatedCustomer");

  return (
    <div
      className={`w-[310px] shrink-0 self-start rounded-[var(--radius-card-lg)] border p-4 shadow-[var(--shadow-card)] ${stageShellClasses[stage]}`}
    >
      <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${stageDotClasses[stage]}`} />
              <p className="truncate text-base font-semibold text-[var(--text-primary)]">{stageLabel}</p>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-tertiary)]">{stageDescription}</p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stageBadgeClasses(
              stage,
            )}`}
          >
            {deals.length}
          </span>
        </div>

        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {t("deals.columnTotal")}
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {formatMoney(totalValue, deals[0]?.currency || "EUR")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid max-h-[calc(100vh-18rem)] gap-3 overflow-y-auto pr-1">
        {deals.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
            {t("deals.emptyColumn")}
          </div>
        ) : (
          deals.map((deal) => (
            <DealBoardCard
              customerLabel={customerLabelById.get(deal.customerId) || noCustomerLabel}
              deal={deal}
              isSelected={deal.id === selectedDealId}
              key={deal.id}
              onSelect={() => onSelectDeal(deal.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
