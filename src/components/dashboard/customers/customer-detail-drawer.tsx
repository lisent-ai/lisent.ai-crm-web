import { Fragment } from "react";

import { type Customer } from "@/lib/dashboard/mock-crm-store";

import { formatLabel } from "./customer-utils";
import { DetailSectionCompact } from "./customer-ui";

type CustomerDetailDrawerProps = {
  customer: Customer;
  companyName: string;
  companyCountry: string;
  onClose: () => void;
};

export function CustomerDetailDrawer({
  customer,
  companyName,
  companyCountry,
  onClose,
}: Readonly<CustomerDetailDrawerProps>) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/28">
      <button
        aria-label="Close detail drawer"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />

      <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-[-12px_0_44px_rgba(15,23,42,0.14)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Customer Detail
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {customer.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{customer.email}</p>
            </div>
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <DetailSectionCompact
            rows={[
              { label: "Customer ID", value: customer.id },
              { label: "Company ID", value: customer.companyId },
              { label: "Company", value: companyName },
              { label: "Status", value: customer.status },
            ]}
            title="Core profile"
          />

          <DetailSectionCompact
            rows={[
              { label: "Name", value: customer.name },
              { label: "First name", value: customer.firstName },
              { label: "Last name", value: customer.lastName || "-" },
              {
                label: "Preferred language",
                value: customer.preferredLanguage,
              },
            ]}
            title="Identity"
          />

          <DetailSectionCompact
            rows={[
              { label: "Email", value: customer.email },
              { label: "Phone", value: customer.phone || "-" },
              { label: "Country code", value: customer.countryCode },
              { label: "Country", value: companyCountry },
            ]}
            title="Contact"
          />

          <section className="rounded-[1.1rem] border border-slate-200 bg-slate-50">
            <header className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                Extra data
              </p>
            </header>
            <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 text-sm">
              {Object.entries(customer.extraData ?? {}).map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="truncate text-slate-500">{formatLabel(key)}</dt>
                  <dd className="break-words font-medium text-slate-900">{value}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
