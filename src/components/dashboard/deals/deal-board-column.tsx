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
  new: "bg-violet-400",
  qualified: "bg-sky-400",
  proposal: "bg-fuchsia-400",
  negotiation: "bg-amber-400",
  won: "bg-emerald-400",
  lost: "bg-rose-400",
};

const stageShellClasses: Record<DealStage, string> = {
  new: "border-violet-200 bg-[linear-gradient(180deg,_rgba(245,243,255,0.9),_#ffffff_30%)]",
  qualified:
    "border-sky-200 bg-[linear-gradient(180deg,_rgba(240,249,255,0.95),_#ffffff_30%)]",
  proposal:
    "border-fuchsia-200 bg-[linear-gradient(180deg,_rgba(253,244,255,0.95),_#ffffff_30%)]",
  negotiation:
    "border-amber-200 bg-[linear-gradient(180deg,_rgba(255,251,235,0.95),_#ffffff_30%)]",
  won: "border-emerald-200 bg-[linear-gradient(180deg,_rgba(236,253,245,0.95),_#ffffff_30%)]",
  lost: "border-rose-200 bg-[linear-gradient(180deg,_rgba(255,241,242,0.95),_#ffffff_30%)]",
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
  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);

  return (
    <div
      className={`w-[310px] shrink-0 self-start rounded-[1.8rem] border p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ${stageShellClasses[stage]}`}
    >
      <div className="rounded-[1.45rem] border border-white/80 bg-white/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${stageDotClasses[stage]}`} />
              <p className="truncate text-base font-semibold text-slate-950">{stageLabel}</p>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">{stageDescription}</p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stageBadgeClasses(
              stage,
            )}`}
          >
            {deals.length}
          </span>
        </div>

        <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-[linear-gradient(145deg,_#f8fafc,_#ffffff)] px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Column total
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatMoney(totalValue, deals[0]?.currency || "EUR")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid max-h-[calc(100vh-18rem)] gap-3 overflow-y-auto pr-1">
        {deals.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
            No deals here yet.
          </div>
        ) : (
          deals.map((deal) => (
            <DealBoardCard
              customerLabel={customerLabelById.get(deal.customerId) || "No related customer"}
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
