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
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
          Deal list
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {dealsLoading ? "Loading deals..." : `${deals.length} deals in view`}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {companiesLoading || dealsLoading ? (
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Deal pipeline is loading...
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm leading-7 text-slate-500">
            No deals match the active filters yet.
          </div>
        ) : (
          deals.map((deal) => {
            const active = deal.id === selectedDealId;

            return (
              <button
                className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                  active
                    ? "border-cyan-300 bg-cyan-50 shadow-[0_12px_24px_rgba(8,145,178,0.08)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
                key={deal.id}
                onClick={() => onSelectDeal(deal.id)}
                type="button"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">
                      {deal.name || "Untitled deal"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
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

                <div className="mt-4 grid gap-2 text-sm text-slate-600">
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
