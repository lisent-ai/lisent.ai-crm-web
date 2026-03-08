import Link from "next/link";

import { type Company } from "@/lib/dashboard/mock-crm-store";

import { DetailMetric } from "./company-ui";

type CompanySelectedPanelProps = {
  company?: Company;
  customerCount: number;
  onDelete: () => void;
};

export function CompanySelectedPanel({
  company,
  customerCount,
  onDelete,
}: Readonly<CompanySelectedPanelProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700/80">
        Selected company
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {company?.name ?? "Choose a company"}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Once a company is selected, the dashboard should expose the company
        import flow and the separate customer directory page.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="ID" value={company?.id ?? "-"} />
        <DetailMetric label="Country" value={company?.country ?? "-"} />
        <DetailMetric label="Industry" value={company?.industry ?? "-"} />
        <DetailMetric label="Customers" value={String(customerCount)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-5">
          <p className="text-lg font-semibold text-slate-950">Company workflow</p>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
            <li>1. Select the company from the directory.</li>
            <li>2. Open customer import for this company.</li>
            <li>3. Approve mapping in the import flow.</li>
            <li>4. Land on the company customer directory page.</li>
          </ul>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7,_#ffffff)] p-5">
          <p className="text-lg font-semibold text-slate-950">Actions</p>
          <div className="mt-4 grid gap-3">
            {company && (
              <>
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
                  href={`/dashboard/imports?company=${company.id}&companyName=${encodeURIComponent(company.name)}`}
                >
                  Open customer import
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  href={`/dashboard/customers?company=${company.id}&companyName=${encodeURIComponent(company.name)}`}
                >
                  Open customer directory
                </Link>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                  onClick={onDelete}
                  type="button"
                >
                  Delete company
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
