import { CompactMeta } from "./customer-ui";

type CustomerCompanyHeaderProps = {
  companyName: string;
  companyId: string;
  country: string;
  industry: string;
  recordCount: number;
  showAddModal: boolean;
  onToggleAddModal: () => void;
};

export function CustomerCompanyHeader({
  companyName,
  companyId,
  country,
  industry,
  recordCount,
  showAddModal,
  onToggleAddModal,
}: Readonly<CustomerCompanyHeaderProps>) {
  return (
    <section className="w-full min-w-0 rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
            Selected company
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {companyName}
          </h2>
        </div>

        <div className="flex items-center lg:justify-end">
          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
            onClick={onToggleAddModal}
            type="button"
          >
            {showAddModal ? "Close add popup" : "Add customer"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMeta label="ID" value={companyId} />
        <CompactMeta label="Country" value={country} />
        <CompactMeta label="Industry" value={industry} />
        <CompactMeta label="Records" value={String(recordCount)} />
      </div>
    </section>
  );
}
