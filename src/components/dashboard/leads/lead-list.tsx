import type { Lead } from "@/lib/crm/client";

import {
  formatAssignmentLabel,
  formatCurrency,
  formatSourceLabel,
  statusBadgeClasses,
} from "./lead-utils";

type LeadListProps = {
  companiesLoading: boolean;
  leadsLoading: boolean;
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
};

export function LeadList({
  companiesLoading,
  leadsLoading,
  leads,
  selectedLeadId,
  onSelectLead,
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
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusBadgeClasses(
                      lead.status,
                    )}`}
                  >
                    {lead.status}
                  </span>
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
