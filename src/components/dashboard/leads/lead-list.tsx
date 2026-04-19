import type { Lead } from "@/lib/crm/client";

import {
  formatAssignmentLabel,
  formatCurrency,
  formatSourceLabel,
  statusBadgeClasses,
} from "./lead-utils";

/** Colored score pill: red <50, amber 50-74, green ≥75. */
function AIScoreChip({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 75
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : clamped >= 50
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-rose-200 bg-rose-50 text-rose-800";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
      aria-label={`AI score ${clamped} of 100`}
    >
      AI {clamped}
    </span>
  );
}

function AIStatusChip({ status }: { status: NonNullable<Lead["aiStatus"]> }) {
  const map: Record<NonNullable<Lead["aiStatus"]>, { label: string; className: string }> = {
    qualified:    { label: "AI · qualified",     className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    chatting:     { label: "AI · chatting",      className: "border-cyan-200 bg-cyan-50 text-cyan-800" },
    pending:      { label: "AI · pending",       className: "border-slate-200 bg-slate-50 text-slate-700" },
    disqualified: { label: "AI · disqualified",  className: "border-rose-200 bg-rose-50 text-rose-800" },
    paused:       { label: "AI · paused",        className: "border-amber-200 bg-amber-50 text-amber-800" },
    error:        { label: "AI · error",         className: "border-rose-300 bg-rose-100 text-rose-900" },
  };
  const entry = map[status];
  if (!entry) return null;
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

type LeadListProps = {
  companiesLoading: boolean;
  leadsLoading: boolean;
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  /** When false the list hides every AI chip (score + status) even if the
   *  lead rows contain AI metadata. Controlled from Lead Directory by the
   *  AI Qualifier Connect/Disconnect lifecycle. */
  aiEnabled: boolean;
};

export function LeadList({
  companiesLoading,
  leadsLoading,
  leads,
  selectedLeadId,
  onSelectLead,
  aiEnabled,
}: Readonly<LeadListProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Lead list
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {leadsLoading ? "Loading leads..." : `${leads.length} leads in view`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {companiesLoading || leadsLoading ? (
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Lead pipeline is loading...
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm leading-7 text-slate-500">
            No leads match the active filters yet.
          </div>
        ) : (
          leads.map((lead) => {
            const active = lead.id === selectedLeadId;

            return (
              <button
                className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                  active
                    ? "border-sky-300 bg-sky-50 shadow-[0_12px_24px_rgba(14,165,233,0.08)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                type="button"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">
                      {lead.name || "Unnamed lead"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[lead.email, lead.phone].filter(Boolean).join(" · ") ||
                        "No contact info"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {aiEnabled && typeof lead.aiScore === "number" ? (
                      <AIScoreChip score={lead.aiScore} />
                    ) : null}
                    {aiEnabled && lead.aiStatus ? (
                      <AIStatusChip status={lead.aiStatus} />
                    ) : null}
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeClasses(
                        lead.status,
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>Source: {formatSourceLabel(lead.source)}</p>
                  <p>Assignee: {formatAssignmentLabel(lead)}</p>
                  <p>Value: {formatCurrency(lead.value)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
