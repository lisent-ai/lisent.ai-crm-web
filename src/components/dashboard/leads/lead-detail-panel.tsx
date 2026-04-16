import type { Lead } from "@/lib/crm/client";
import { CompactMeta, DetailSectionCompact } from "@/components/dashboard/customers/customer-ui";

import {
  formatAssignmentLabel,
  formatCurrency,
  formatDateTime,
  formatSourceLabel,
  statusBadgeClasses,
} from "./lead-utils";

type LeadDetailPanelProps = {
  lead: Lead | null;
  customerLabel: string | undefined;
  saving: boolean;
  assignableMembersCount: number;
  onEdit: (lead: Lead) => void;
  onAssignRoundRobin: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
};

export function LeadDetailPanel({
  lead,
  customerLabel,
  saving,
  assignableMembersCount,
  onEdit,
  onAssignRoundRobin,
  onConvert,
  onDelete,
}: Readonly<LeadDetailPanelProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      {lead ? (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Lead detail
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {lead.name || "Unnamed lead"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {lead.notes || "No notes recorded for this lead yet."}
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeClasses(
                lead.status,
              )}`}
            >
              {lead.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMeta label="Source" value={formatSourceLabel(lead.source)} />
            <CompactMeta label="Assignee" value={formatAssignmentLabel(lead)} />
            <CompactMeta label="Linked customer" value={customerLabel || "None"} />
            <CompactMeta label="Value" value={formatCurrency(lead.value)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={saving}
              onClick={() => onEdit(lead)}
              type="button"
            >
              Edit lead
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
              disabled={saving || assignableMembersCount === 0}
              onClick={() => onAssignRoundRobin(lead)}
              type="button"
            >
              Assign next round-robin
            </button>
            <button
              className="rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50"
              disabled={saving || lead.status === "converted"}
              onClick={() => onConvert(lead)}
              type="button"
            >
              Convert lead
            </button>
            <button
              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50"
              disabled={saving}
              onClick={() => onDelete(lead)}
              type="button"
            >
              Delete
            </button>
          </div>

          <DetailSectionCompact
            rows={[
              { label: "Email", value: lead.email || "—" },
              { label: "Phone", value: lead.phone || "—" },
              { label: "Assignment", value: lead.assignmentMethod },
              { label: "Customer ID", value: lead.customerId || "—" },
              {
                label: "Converted customer",
                value: lead.convertedCustomerId || "—",
              },
              { label: "Converted deal", value: lead.convertedDealId || "—" },
              { label: "Created", value: formatDateTime(lead.createdAt) },
              { label: "Updated", value: formatDateTime(lead.updatedAt) },
              { label: "Converted at", value: formatDateTime(lead.convertedAt) },
            ]}
            title="Lead record"
          />

          <section className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
              Extra data
            </p>
            <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(lead.extraData, null, 2)}
            </pre>
          </section>
        </div>
      ) : (
        <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm leading-7 text-slate-500">
          Select a lead to inspect details, update pipeline stage, assign an owner,
          or convert it into downstream records.
        </div>
      )}
    </section>
  );
}
