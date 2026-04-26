import { Fragment } from "react";

import { type Customer } from "@/lib/crm/client";

import { describeCustomerCountry, formatLabel } from "./customer-utils";
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
    <div className="fixed inset-0 z-50 bg-[color-mix(in_srgb,_var(--text-primary)_28%,_transparent)]">
      <button
        aria-label="Close detail drawer"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />

      <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[560px] flex-col border-l border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                Customer Detail
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {customer.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{customer.email}</p>
            </div>
            <button
              className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
              {
                label: "Country",
                value: describeCustomerCountry(
                  customer.countryCode,
                  customer.extraData,
                  companyCountry,
                ),
              },
            ]}
            title="Contact"
          />

          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <header className="border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Extra data
              </p>
            </header>
            <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 text-sm">
              {Object.entries(customer.extraData ?? {}).map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="truncate text-[var(--text-tertiary)]">{formatLabel(key)}</dt>
                  <dd className="break-words font-medium text-[var(--text-primary)]">{value}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
