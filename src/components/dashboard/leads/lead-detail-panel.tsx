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

  const score = typeof lead.aiScore === "number" ? Math.round(lead.aiScore) : null;
  const breakdown = (lead.aiScoreBreakdown ?? {}) as Record<string, unknown>;
  const champ = (lead.aiChamp ?? null) as Record<string, unknown> | null;

  return (
    <section className="rounded-[1.4rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-[0_10px_30px_rgba(99,102,241,0.08)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-sm">
            AI
          </span>
          <p className="text-sm font-semibold tracking-[0.14em] text-violet-900">
            LEAD QUALIFIER
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lead.aiStatus ? <StatusPill status={lead.aiStatus} /> : null}
          {lead.aiPath ? <PathPill path={lead.aiPath} /> : null}
          {lead.aiLastScoredAt ? (
            <span className="text-[11px] text-violet-700/80">
              scored {formatDateTime(lead.aiLastScoredAt)}
            </span>
          ) : null}
        </div>
      </header>

      {score !== null ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <ScoreDial value={score} />
          <div className="grid gap-2">
            {SCORE_DIMENSIONS.map((dim) => {
              const raw = breakdown[dim.key];
              const n = typeof raw === "number" ? raw : 0;
              return (
                <ScoreBar
                  key={dim.key}
                  label={dim.label}
                  value={n}
                  max={dim.max}
                  tone={dim.tone}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {champ ? <ChampSection champ={champ} /> : null}

      {lead.aiReasoning ? (
        <details className="mt-4 rounded-xl border border-violet-100 bg-white" open>
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            Reasoning report
          </summary>
          <pre className="m-0 overflow-auto border-t border-violet-100 p-3 text-xs leading-6 text-slate-800">
            {JSON.stringify(lead.aiReasoning, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

// Fit-score sub-dimensions with their caps — matches the qualifier's
// rule-based scorer (budget 30, timeline 25, project 20, authority 15,
// data quality 10).
const SCORE_DIMENSIONS: {
  key: string;
  label: string;
  max: number;
  tone: "emerald" | "sky" | "violet" | "amber" | "slate";
}[] = [
  { key: "budget", label: "Budget", max: 30, tone: "emerald" },
  { key: "timeline", label: "Timeline", max: 25, tone: "sky" },
  { key: "project_type", label: "Project type", max: 20, tone: "violet" },
  { key: "authority", label: "Authority", max: 15, tone: "amber" },
  { key: "data_quality", label: "Data quality", max: 10, tone: "slate" },
];

function ScoreDial({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  // Conic-gradient ring — clean, no SVG dependency.
  const ring = `conic-gradient(#7c3aed ${pct * 3.6}deg, #ede9fe ${pct * 3.6}deg)`;
  return (
    <div
      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
      style={{ background: ring }}
    >
      <div className="flex h-[86%] w-[86%] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-bold tracking-tight text-violet-900">
          {value}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          / 100
        </span>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "emerald" | "sky" | "violet" | "amber" | "slate";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tones: Record<typeof tone, string> = {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    slate: "bg-slate-400",
  };
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">
          {value} <span className="text-slate-400">/ {max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
        <div
          className={`h-full rounded-full ${tones[tone]} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const CHAMP_DIMENSIONS = [
  { key: "challenges", label: "Challenges", letter: "C" },
  { key: "authority", label: "Authority", letter: "H" },
  { key: "money", label: "Money", letter: "A" },
  { key: "prioritization", label: "Prioritization", letter: "M" },
] as const;

function ChampSection({ champ }: { champ: Record<string, unknown> }) {
  const total = CHAMP_DIMENSIONS.reduce((sum, d) => {
    const v = champ[`${d.key}_score`];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
  const confidence = typeof champ.confidence === "string" ? (champ.confidence as string) : null;

  return (
    <div className="mt-4 rounded-xl border border-violet-100 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            CHAMP extraction
          </p>
          {confidence ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                confidence === "high"
                  ? "bg-emerald-100 text-emerald-700"
                  : confidence === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {confidence} confidence
            </span>
          ) : null}
        </div>
        <span className="font-mono text-xs text-slate-500">
          {total} <span className="text-slate-400">/ 100</span>
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {CHAMP_DIMENSIONS.map((d) => {
          const raw = champ[`${d.key}_score`];
          const conf = champ[`${d.key}_confidence`];
          const notes = champ[`${d.key}_notes`];
          const v = typeof raw === "number" ? raw : 0;
          const c = typeof conf === "number" ? conf : null;
          return (
            <div
              key={d.key}
              className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-600 text-[10px] font-bold text-white">
                    {d.letter}
                  </span>
                  {d.label}
                </span>
                <span className="font-mono text-slate-500">
                  {v}
                  <span className="text-slate-400"> / 25</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                <div
                  className="h-full rounded-full bg-violet-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, (v / 25) * 100)}%` }}
                />
              </div>
              {c !== null ? (
                <p className="mt-1 text-[10px] text-slate-400">
                  confidence {Math.round(c * 100)}%
                </p>
              ) : null}
              {typeof notes === "string" && notes ? (
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  {notes}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    chatting: "bg-sky-100 text-sky-700 border-sky-200",
    qualified: "bg-emerald-100 text-emerald-700 border-emerald-200",
    disqualified: "bg-slate-200 text-slate-600 border-slate-300",
    paused: "bg-slate-100 text-slate-600 border-slate-200",
    error: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function PathPill({ path }: { path: string }) {
  const cls =
    path === "fast"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-violet-50 text-violet-700 border-violet-200";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {path} path
    </span>
  );
}
