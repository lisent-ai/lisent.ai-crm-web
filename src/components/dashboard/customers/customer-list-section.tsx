"use client";

import { useTranslations } from "next-intl";

import { type Customer } from "@/lib/crm/client";

import { describeCustomerCountry } from "./customer-utils";
import { Field } from "./customer-ui";

type CustomerListSectionProps = {
  customers: Customer[];
  selectedIds: Set<string>;
  selectedCustomerId: string | null;
  selectedCompanyCountry: string;
  searchQuery: string;
  statusFilter: string;
  onToggleAll: () => void;
  onToggleOne: (customerId: string) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onViewCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
};

export function CustomerListSection({
  customers,
  selectedIds,
  selectedCustomerId,
  selectedCompanyCountry,
  searchQuery,
  statusFilter,
  onToggleAll,
  onToggleOne,
  onSearchQueryChange,
  onStatusFilterChange,
  onViewCustomer,
  onEditCustomer,
  onDeleteCustomer,
}: Readonly<CustomerListSectionProps>) {
  const t = useTranslations();
  const allSelected = customers.length > 0 && customers.every((customer) => selectedIds.has(customer.id));
  const indeterminate = selectedIds.size > 0 && !allSelected;
  const notSet = t("customers.notSet");

  return (
    <section className="w-full min-w-0 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
            {t("customers.list.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t("customers.list.title")}
          </h2>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
          {t("customers.list.visibleCount", { count: customers.length })}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
        <Field
          label={t("customers.search.label")}
          onChange={onSearchQueryChange}
          placeholder={t("customers.search.placeholder")}
          value={searchQuery}
        />
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t("customers.statusFilter")}</span>
          <select
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            onChange={(event) => onStatusFilterChange(event.target.value)}
            value={statusFilter}
          >
            <option value="All">{t("customers.status.all")}</option>
            <option value="Active">{t("customers.status.active")}</option>
            <option value="Prospect">{t("customers.status.prospect")}</option>
            <option value="Needs review">{t("customers.status.needsReview")}</option>
          </select>
        </label>
      </div>

      <div className="mt-5 min-w-0 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)]">
        <div className="max-h-[46rem] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface-inset)] text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              <tr>
                <th className="w-[52px] px-4 py-3 font-medium">
                  <HeaderCheckbox
                    checked={allSelected}
                    indeterminate={indeterminate}
                    onChange={onToggleAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">{t("customers.fields.name")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.fields.phone")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.fields.email")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.fields.country")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.fields.status")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.fields.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const selected = customer.id === selectedCustomerId;
                const checked = selectedIds.has(customer.id);

                return (
                  <tr
                    className={`border-t border-[var(--border-subtle)] ${
                      selected
                        ? "bg-[color-mix(in_srgb,_var(--accent)_8%,_var(--surface))]"
                        : "bg-[var(--surface)]"
                    }`}
                    key={customer.id}
                  >
                    <td className="px-4 py-3">
                      <input
                        aria-label={t("customers.list.selectRow", {
                          name: customer.name || t("customers.fields.customer"),
                        })}
                        checked={checked}
                        className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent-strong)]"
                        onChange={() => onToggleOne(customer.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{customer.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{customer.phone}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{customer.email}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {describeCustomerCountry(
                        customer.countryCode,
                        customer.extraData,
                        selectedCompanyCountry,
                        notSet,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap gap-2">
                        <button
                          className="whitespace-nowrap rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                          onClick={() => onViewCustomer(customer)}
                          type="button"
                        >
                          {t("customers.actions.view")}
                        </button>
                        <button
                          className="whitespace-nowrap rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                          onClick={() => onEditCustomer(customer)}
                          type="button"
                        >
                          {t("customers.actions.edit")}
                        </button>
                        <button
                          className="whitespace-nowrap rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
                          onClick={() => onDeleteCustomer(customer)}
                          type="button"
                        >
                          {t("customers.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {customers.length === 0 && (
        <div className="mt-4 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 text-sm text-[var(--text-tertiary)]">
          {t("customers.list.empty")}
        </div>
      )}
    </section>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: Readonly<{
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}>) {
  const t = useTranslations();
  return (
    <input
      aria-label={t("customers.list.selectAll")}
      checked={checked}
      className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent-strong)]"
      onChange={onChange}
      ref={(node) => {
        if (node) {
          node.indeterminate = indeterminate;
        }
      }}
      type="checkbox"
    />
  );
}
