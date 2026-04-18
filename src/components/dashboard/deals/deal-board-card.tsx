import type { Deal } from "@/lib/crm/client";

import {
  buildInitials,
  formatAssigneeLabel,
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
  return (
    <button
      className={`rounded-[1.45rem] border bg-white p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${
        isSelected
          ? "border-cyan-300 ring-2 ring-cyan-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            #{deal.id.slice(0, 8)}
          </p>
          <p className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-slate-950">
            {deal.name || "Untitled deal"}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {deal.comments.length} comments
        </span>
      </div>

      <p className="mt-3 truncate text-sm text-slate-500">{customerLabel}</p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(145deg,_#f8fafc,_#eef2ff)] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Deal value
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatMoney(deal.amount, deal.currency)}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white text-xs font-semibold text-slate-700 shadow-sm">
              {buildInitials(formatAssigneeLabel(deal))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="font-semibold uppercase tracking-[0.14em] text-slate-400">Assignee</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-900">
              {formatAssigneeLabel(deal)}
            </p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="font-semibold uppercase tracking-[0.14em] text-slate-400">Close</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-900">
              {formatShortDate(deal.closeDate)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
