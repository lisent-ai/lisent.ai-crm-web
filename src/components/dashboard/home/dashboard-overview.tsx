"use client";

import Link from "next/link";

import { useMockCrmStore } from "@/lib/dashboard/mock-crm-store";

export function DashboardOverview() {
  const { companies, customersByCompany } = useMockCrmStore();
  const totalCustomers = companies.reduce(
    (sum, company) => sum + (customersByCompany[company.id]?.length ?? 0),
    0,
  );

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Overview
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Workspace dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          The sidebar is the main navigation surface. Companies, imports, and
          customers live on separate pages so the CRM feels like a real product
          shell instead of a stacked mock.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <OverviewCard label="Companies" value={String(companies.length)} />
        <OverviewCard label="Customers" value={String(totalCustomers)} />
        <OverviewCard label="Imports ready" value="2" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
            Suggested flow
          </p>
          <ol className="mt-5 grid gap-4 text-sm leading-7 text-slate-600">
            <li>1. User signs in and lands on the dashboard home.</li>
            <li>2. User opens the Companies section from the sidebar.</li>
            <li>3. User adds or selects a company.</li>
            <li>4. User opens customer import for that company.</li>
            <li>5. After mapping approval, user lands on the customer directory page.</li>
          </ol>
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7,_#f8fafc)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700/80">
            Quick actions
          </p>
          <div className="mt-5 grid gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
              href="/dashboard/companies"
            >
              Open companies
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/dashboard/imports?company=lisent-ai&companyName=Lisent.ai"
            >
              Open import flow
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewCard({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}
