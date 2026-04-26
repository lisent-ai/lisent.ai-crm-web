import type { Company, DealStage } from "@/lib/crm/client";
import { CompactMeta } from "@/components/dashboard/customers/customer-ui";

type DealHeaderProps = {
  company: Company | null;
  companyName: string;
  dealCount: number;
  saving: boolean;
  onCreate: () => void;
  pipelineCounts: Array<{ stage: DealStage; count: number }>;
};

export function DealHeader({
  company,
  companyName,
  dealCount,
  saving,
  onCreate,
  pipelineCounts,
}: Readonly<DealHeaderProps>) {
  return (
    <section className="min-w-0 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          {companyName}
        </h2>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <button
            className="rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-90 disabled:opacity-50"
            disabled={!company || saving}
            onClick={onCreate}
            type="button"
          >
            Add deal
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMeta label="Company ID" value={company?.id ?? "-"} />
        <CompactMeta label="Country" value={company?.country ?? "-"} />
        <CompactMeta label="Industry" value={company?.industry ?? "-"} />
        <CompactMeta label="Records" value={String(dealCount)} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {pipelineCounts.map((item) => (
          <div
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4"
            key={item.stage}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {item.stage}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{item.count}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
