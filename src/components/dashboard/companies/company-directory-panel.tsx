import { type Company } from "@/lib/dashboard/mock-crm-store";

type CompanyDirectoryPanelProps = {
  companies: Company[];
  activeCompanyId?: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSelectCompany: (companyId: string) => void;
  getCustomerCount: (companyId: string) => number;
};

export function CompanyDirectoryPanel({
  companies,
  activeCompanyId,
  searchQuery,
  onSearchQueryChange,
  onSelectCompany,
  getCustomerCount,
}: Readonly<CompanyDirectoryPanelProps>) {
  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-5 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700/80">
            Directory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Company list
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Scrollable
        </span>
      </div>

      <div className="mt-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">
            Search company
          </span>
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search by name, country, industry..."
            value={searchQuery}
          />
        </label>
      </div>

      <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
        {companies.map((company) => {
          const active = company.id === activeCompanyId;
          const customerCount = getCustomerCount(company.id);

          return (
            <button
              className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
              }`}
              key={company.id}
              onClick={() => onSelectCompany(company.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{company.name}</h3>
                  <p
                    className={`mt-1 text-sm ${
                      active ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {company.country} · {company.industry}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    active
                      ? "bg-white/10 text-cyan-300"
                      : "border border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {active ? "Selected" : "Open"}
                </span>
              </div>

              <div
                className={`mt-4 flex items-center justify-between text-sm ${
                  active ? "text-slate-200" : "text-slate-600"
                }`}
              >
                <span className="truncate">{company.id}</span>
                <span className="font-medium">{customerCount} customers</span>
              </div>
            </button>
          );
        })}

        {companies.length === 0 && (
          <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            No companies matched the current search.
          </div>
        )}
      </div>
    </div>
  );
}
