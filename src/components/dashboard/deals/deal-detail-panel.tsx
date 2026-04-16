import type { Deal } from "@/lib/crm/client";
import { CompactMeta, DetailSectionCompact } from "@/components/dashboard/customers/customer-ui";

import {
  formatAssigneeLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatStageDuration,
  formatStageLabel,
  stageBadgeClasses,
} from "./deal-utils";

type DealDetailPanelProps = {
  deal: Deal | null;
  companyLabel: string;
  customerLabel: string;
  sourceLeadLabel: string;
  saving: boolean;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
};

export function DealDetailPanel({
  deal,
  companyLabel,
  customerLabel,
  sourceLeadLabel,
  saving,
  onEdit,
  onDelete,
}: Readonly<DealDetailPanelProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      {deal ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Deal detail
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {deal.name || "Untitled deal"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {deal.stage === "won"
                  ? deal.wonReason || "No win reason recorded yet."
                  : deal.stage === "lost"
                    ? deal.lossReason || "No loss reason recorded yet."
                    : "Opportunity is still active in the pipeline."}
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMeta label="Amount" value={formatMoney(deal.amount, deal.currency)} />
            <CompactMeta label="Assignee" value={formatAssigneeLabel(deal)} />
            <CompactMeta label="Close target" value={formatDate(deal.closeDate)} />
            <CompactMeta
              label="Termination"
              value={deal.terminationDate ? formatDate(deal.terminationDate) : "Open"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={saving}
              onClick={() => onEdit(deal)}
              type="button"
            >
              Edit deal
            </button>
            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50"
              disabled={saving}
              onClick={() => onDelete(deal)}
              type="button"
            >
              Delete
            </button>
          </div>

          <DetailSectionCompact
            rows={[
              { label: "Company", value: companyLabel || "—" },
              { label: "Customer", value: customerLabel || "—" },
              { label: "Source lead", value: sourceLeadLabel || "—" },
              { label: "Currency", value: deal.currency || "—" },
              { label: "Won reason", value: deal.wonReason || "—" },
              { label: "Loss reason", value: deal.lossReason || "—" },
              { label: "Created", value: formatDateTime(deal.createdAt) },
              { label: "Updated", value: formatDateTime(deal.updatedAt) },
            ]}
            title="Related records"
          />

          <section className="rounded-[1.1rem] border border-slate-200 bg-slate-50">
            <header className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                Stage history
              </p>
            </header>
            <div className="grid gap-3 px-4 py-4">
              {deal.stageHistory.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No stage history recorded yet.
                </p>
              ) : (
                deal.stageHistory.map((entry) => (
                  <div
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {formatStageLabel(entry.stage)}
                      </p>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {formatStageDuration(entry)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDateTime(entry.enteredAt)} to{" "}
                      {entry.exitedAt ? formatDateTime(entry.exitedAt) : "Now"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Changed by {entry.changedByUserName || entry.changedByUserId || "System"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {Object.keys(deal.extraData).length > 0 ? (
            <section className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                Extra data
              </p>
              <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(deal.extraData, null, 2)}
              </pre>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm leading-7 text-slate-500">
          Select a deal to inspect its pipeline state, related records, assignee,
          termination details, and stage history.
        </div>
      )}
    </section>
  );
}
