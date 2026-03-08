type CompanyWorkspaceHeaderProps = {
  companyCount: number;
  showCreatePanel: boolean;
  onToggleCreatePanel: () => void;
};

export function CompanyWorkspaceHeader({
  companyCount,
  showCreatePanel,
  onToggleCreatePanel,
}: Readonly<CompanyWorkspaceHeaderProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Companies
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Company workspace
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            This section is built for a real dashboard. The company list can
            scale, company creation sits behind a dedicated add action, and the
            selected company exposes import and customer-directory actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
            {companyCount} companies
          </span>
          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
            onClick={onToggleCreatePanel}
            type="button"
          >
            {showCreatePanel ? "Close add company" : "+ Add company"}
          </button>
        </div>
      </div>
    </section>
  );
}
