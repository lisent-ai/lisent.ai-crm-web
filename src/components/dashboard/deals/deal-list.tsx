import type { Deal } from "@/lib/crm/client";

import {
  formatAssigneeLabel,
  formatMoney,
  formatStageLabel,
  stageBadgeClasses,
} from "./deal-utils";

type DealListProps = {
  companiesLoading: boolean;
  dealsLoading: boolean;
  deals: Deal[];
  selectedDealId: string | null;
  customerLabelById: Map<string, string>;
  onSelectDeal: (dealId: string) => void;
};

export function DealList({
  companiesLoading,
  dealsLoading,
  deals,
  selectedDealId,
  customerLabelById,
  onSelectDeal,
}: Readonly<DealListProps>) {
  return (
    <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
          Deal list
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {dealsLoading ? "Loading deals..." : `${deals.length} deals in view`}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {companiesLoading || dealsLoading ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-6 text-sm text-[var(--text-tertiary)]">
            Deal pipeline is loading...
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-8 text-sm leading-7 text-[var(--text-tertiary)]">
            No deals match the active filters yet.
          </div>
        ) : (
          deals.map((deal) => {
            const active = deal.id === selectedDealId;

            return (
              <button
                className={`rounded-[var(--radius-card-lg)] border px-4 py-4 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,_var(--accent)_8%,_var(--surface))] shadow-[var(--shadow-card)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-default)] hover:bg-[var(--surface-muted)]"
                }`}
                key={deal.id}
                onClick={() => onSelectDeal(deal.id)}
                type="button"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      {deal.name || "Untitled deal"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                      {customerLabelById.get(deal.customerId) || "No related customer"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${stageBadgeClasses(
                      deal.stage,
                    )}`}
                  >
                    {formatStageLabel(deal.stage)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
                  <p>Amount: {formatMoney(deal.amount, deal.currency)}</p>
                  <p>Assignee: {formatAssigneeLabel(deal)}</p>
                  <p>Close target: {deal.closeDate || "Not set"}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
