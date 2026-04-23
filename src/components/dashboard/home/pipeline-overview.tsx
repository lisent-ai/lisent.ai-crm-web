import type { Deal, DealStage } from "@/lib/crm/client";

type PipelineOverviewProps = {
  deals: Deal[];
  emptyHint?: string;
};

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: "new", label: "New", color: "var(--signal-blue)" },
  { key: "qualified", label: "Qualified", color: "var(--accent)" },
  { key: "proposal", label: "Proposal", color: "var(--signal-amber)" },
  { key: "negotiation", label: "Negotiation", color: "var(--signal-purple)" },
  { key: "won", label: "Won", color: "var(--signal-green)" },
  { key: "lost", label: "Lost", color: "var(--signal-red)" },
];

export function PipelineOverview({
  deals,
  emptyHint = "Pick a company to see deal pipeline.",
}: Readonly<PipelineOverviewProps>) {
  const counts = new Map<DealStage, { count: number; amount: number; currency: string }>();
  for (const deal of deals) {
    const prev = counts.get(deal.stage) ?? { count: 0, amount: 0, currency: deal.currency || "USD" };
    prev.count += 1;
    prev.amount += Number.isFinite(deal.amount) ? deal.amount : 0;
    counts.set(deal.stage, prev);
  }
  const total = deals.length;

  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Pipeline overview
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Deal distribution by stage
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
          {total} total
        </span>
      </div>

      {total === 0 ? (
        <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {emptyHint}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {STAGES.map((stage) => {
            const data = counts.get(stage.key) ?? { count: 0, amount: 0, currency: "USD" };
            const pct = total > 0 ? (data.count / total) * 100 : 0;
            return (
              <div key={stage.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-[var(--text-secondary)]">
                    {stage.label}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {data.count}
                    {data.amount > 0 ? ` · ${formatAmount(data.amount, data.currency)}` : ""}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-inset)]">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${pct}%`, background: stage.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency || ""}`.trim();
  }
}
