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
  onStartQualify: (lead: Lead) => void;
  /** When false the AI Lead Qualifier insights block is hidden entirely
   *  (even if the lead row still has ai_score / ai_champ / ai_reasoning).
   *  Controlled from Lead Directory based on the company's Connect
   *  lifecycle in the Integrations Hub. */
  aiEnabled: boolean;
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
  onStartQualify,
  aiEnabled,
}: Readonly<LeadDetailPanelProps>) {
  const canStartQualify = aiEnabled && lead?.aiStatus === "pending";
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
            {canStartQualify ? (
              <button
                className="rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                disabled={saving}
                onClick={() => onStartQualify(lead)}
                type="button"
              >
                {saving ? "Starting…" : "Start qualify"}
              </button>
            ) : null}
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

          {aiEnabled ? <AIInsightsSection lead={lead} /> : null}

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

/**
 * Renders the AI Lead Qualifier metadata attached to a lead. Collapses
 * itself to nothing when the lead has never been scored — that way the
 * panel stays clean for pre-qualifier leads and only surfaces AI insights
 * when they actually exist.
 */
function AIInsightsSection({ lead }: { lead: Lead }) {
  const hasAny =
    typeof lead.aiScore === "number" ||
    lead.aiStatus ||
    lead.aiReasoning ||
    lead.aiChamp ||
    lead.aiScoreBreakdown;
  if (!hasAny) return null;

  return (
    <section className="rounded-[1.1rem] border border-violet-200 bg-violet-50/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-800">
          AI Lead Qualifier insights
        </p>
        {lead.aiLastScoredAt ? (
          <span className="text-xs text-violet-700">
            scored {formatDateTime(lead.aiLastScoredAt)}
          </span>
        ) : null}
      </header>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {typeof lead.aiScore === "number" ? (
          <Metric label="AI score" value={`${Math.round(lead.aiScore)} / 100`} />
        ) : null}
        {lead.aiStatus ? <Metric label="AI status" value={lead.aiStatus} /> : null}
        {lead.aiPath ? <Metric label="Path" value={lead.aiPath} /> : null}
      </div>

      {lead.aiScoreBreakdown ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-violet-800">
            Score breakdown
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-white p-3 text-xs leading-6 text-slate-800">
            {JSON.stringify(lead.aiScoreBreakdown, null, 2)}
          </pre>
        </details>
      ) : null}

      {lead.aiChamp ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-violet-800">
            CHAMP extraction
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-white p-3 text-xs leading-6 text-slate-800">
            {JSON.stringify(lead.aiChamp, null, 2)}
          </pre>
        </details>
      ) : null}

      {lead.aiReasoning ? (
        <details className="mt-3" open>
          <summary className="cursor-pointer text-xs font-semibold text-violet-800">
            Reasoning report
          </summary>
          <pre className="mt-2 overflow-auto rounded-xl bg-white p-3 text-xs leading-6 text-slate-800">
            {JSON.stringify(lead.aiReasoning, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-700">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
