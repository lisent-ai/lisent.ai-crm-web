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
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700/80">
            Deal pipeline
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {companyName}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Track opportunities from first qualification to proposal, negotiation,
            and final outcome with assignees, termination info, and stage history.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#164e63)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:opacity-50"
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
            className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4"
            key={item.stage}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {item.stage}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
