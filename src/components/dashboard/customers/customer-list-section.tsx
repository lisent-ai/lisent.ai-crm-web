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
  const allSelected = customers.length > 0 && customers.every((customer) => selectedIds.has(customer.id));
  const indeterminate = selectedIds.size > 0 && !allSelected;

  return (
    <section className="w-full min-w-0 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
            Customer list
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Related customers
          </h2>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
          {customers.length} visible
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
        <Field
          label="Search customers"
          onChange={onSearchQueryChange}
          placeholder="Search by name, email, phone..."
          value={searchQuery}
        />
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Status filter</span>
          <select
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            onChange={(event) => onStatusFilterChange(event.target.value)}
            value={statusFilter}
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Prospect">Prospect</option>
            <option value="Needs review">Needs review</option>
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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
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
                        aria-label={`Select ${customer.name || "customer"}`}
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
                          View
                        </button>
                        <button
                          className="whitespace-nowrap rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                          onClick={() => onEditCustomer(customer)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="whitespace-nowrap rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
                          onClick={() => onDeleteCustomer(customer)}
                          type="button"
                        >
                          Delete
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
          No customers matched the current filters.
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
  return (
    <input
      aria-label="Select all customers"
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
