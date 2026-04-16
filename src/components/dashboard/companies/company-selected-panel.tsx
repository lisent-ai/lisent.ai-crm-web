import Link from "next/link";

import {
  getCompanyMembershipSummary,
  hasCompanyPermissionInAccess,
} from "@/lib/auth/access-control";
import type { AccountAccessSummary } from "@/lib/auth/account-profile";
import { getCompanyRoleLabel } from "@/lib/auth/roles";
import { type Company } from "@/lib/crm/client";

import { DetailMetric } from "./company-ui";
import { CompanyWhatsAppPanel } from "./company-whatsapp-panel";
import { CompanyQualifierPanel } from "./company-qualifier-panel";
import { CompanyQualifierLeads } from "./company-qualifier-leads";

type CompanySelectedPanelProps = {
  company?: Company;
  customerCount: number;
  onDelete: () => void;
  access: AccountAccessSummary | null;
};

export function CompanySelectedPanel({
  company,
  customerCount,
  onDelete,
  access,
}: Readonly<CompanySelectedPanelProps>) {
  const companyMembership =
    company && access ? getCompanyMembershipSummary(access, company.id) : null;
  const currentRoleLabel = companyMembership
    ? getCompanyRoleLabel(companyMembership.role)
    : access?.isSuperAdmin
      ? "Super Admin"
      : "-";
  const canDeleteCompany =
    company && access
      ? hasCompanyPermissionInAccess(access, company.id, "company.delete")
      : false;
  const canReadCustomers =
    company && access
      ? hasCompanyPermissionInAccess(access, company.id, "customers.read")
      : false;
  const canRunImports =
    company && access
      ? hasCompanyPermissionInAccess(access, company.id, "imports.run")
      : false;
  const canManageIntegrations =
    company && access
      ? hasCompanyPermissionInAccess(access, company.id, "integrations.manage")
      : false;
  const canManageQualifier =
    company && access
      ? hasCompanyPermissionInAccess(access, company.id, "qualifier.manage")
      : false;

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

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailMetric label="ID" value={company?.id ?? "-"} />
        <DetailMetric label="Country" value={company?.country ?? "-"} />
        <DetailMetric label="Industry" value={company?.industry ?? "-"} />
        <DetailMetric label="Customers" value={String(customerCount)} />
        <DetailMetric label="Your role" value={currentRoleLabel} />
        <DetailMetric
          label="Created by"
          value={company?.createdByUserName ?? "-"}
        />
        <DetailMetric
          label="Creator user id"
          value={company?.createdByUserId || "-"}
        />
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
                {canRunImports ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
                    href={`/dashboard/imports?company=${company.id}&companyName=${encodeURIComponent(company.name)}`}
                  >
                    Open customer import
                  </Link>
                ) : null}
                {canReadCustomers ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                    href={`/dashboard/leads?company=${company.id}&companyName=${encodeURIComponent(company.name)}`}
                  >
                    Open lead pipeline
                  </Link>
                ) : null}
                {canReadCustomers ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                    href={`/dashboard/customers?company=${company.id}&companyName=${encodeURIComponent(company.name)}`}
                  >
                    Open customer directory
                  </Link>
                ) : null}
                {access ? (
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                    href={`/dashboard/access?company=${company.id}&companyName=${encodeURIComponent(company.name)}`}
                  >
                    Open team access
                  </Link>
                ) : null}
                {canDeleteCompany ? (
                  <button
                    className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                    onClick={onDelete}
                    type="button"
                  >
                    Delete company
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {company && (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {canManageIntegrations ? (
              <CompanyWhatsAppPanel companyId={company.id} />
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-semibold text-slate-950">WhatsApp integration</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Only owners and admins can view or change GreenAPI connection details.
                </p>
              </div>
            )}
            {canManageQualifier ? (
              <CompanyQualifierPanel companyId={company.id} />
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-semibold text-slate-950">AI lead qualifier</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Qualifier webhook configuration is limited to admins and owners.
                </p>
              </div>
            )}
          </div>
          {canReadCustomers ? (
            <div className="mt-4">
              <CompanyQualifierLeads companyId={company.id} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
