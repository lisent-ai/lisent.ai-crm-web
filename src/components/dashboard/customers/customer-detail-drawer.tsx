"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const dash = "-";
  const notSet = t("customers.notSet");
  return (
    <div className="fixed inset-0 z-50 bg-[color-mix(in_srgb,_var(--text-primary)_28%,_transparent)]">
      <button
        aria-label={t("customers.detail.closeDrawer")}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />

      <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-full flex-col bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-w-[560px] sm:border-l sm:border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                {t("customers.detail.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {customer.name}
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{customer.email}</p>
            </div>
            <button
              className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              type="button"
            >
              {t("common.close")}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <DetailSectionCompact
            rows={[
              { label: t("customers.fields.customerId"), value: customer.id },
              { label: t("customers.fields.companyId"), value: customer.companyId },
              { label: t("customers.fields.company"), value: companyName },
              { label: t("customers.fields.status"), value: customer.status },
            ]}
            title={t("customers.detail.coreProfile")}
          />

          <DetailSectionCompact
            rows={[
              { label: t("customers.fields.name"), value: customer.name },
              { label: t("customers.fields.firstName"), value: customer.firstName },
              { label: t("customers.fields.lastName"), value: customer.lastName || dash },
              {
                label: t("customers.fields.preferredLanguage"),
                value: customer.preferredLanguage,
              },
            ]}
            title={t("customers.detail.identity")}
          />

          <DetailSectionCompact
            rows={[
              { label: t("customers.fields.email"), value: customer.email },
              { label: t("customers.fields.phone"), value: customer.phone || dash },
              { label: t("customers.fields.countryCode"), value: customer.countryCode },
              {
                label: t("customers.fields.country"),
                value: describeCustomerCountry(
                  customer.countryCode,
                  customer.extraData,
                  companyCountry,
                  notSet,
                ),
              },
            ]}
            title={t("customers.detail.contact")}
          />

          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <header className="border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {t("customers.detail.extraData")}
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
