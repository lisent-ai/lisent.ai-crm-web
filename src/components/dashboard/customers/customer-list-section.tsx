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
    <section className="w-full min-w-0 rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Customer list
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Related customers
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
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
          <span className="text-sm font-medium text-slate-700">Status filter</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
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

      <div className="mt-5 min-w-0 overflow-hidden rounded-[1.4rem] border border-slate-200">
        <div className="max-h-[46rem] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-[0.22em] text-slate-500">
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
                    className={`border-t border-slate-200 ${
                      selected ? "bg-sky-50/60" : "bg-white"
                    }`}
                    key={customer.id}
                  >
                    <td className="px-4 py-3">
                      <input
                        aria-label={`Select ${customer.name || "customer"}`}
                        checked={checked}
                        className="h-4 w-4 rounded border-slate-300 accent-sky-600"
                        onChange={() => onToggleOne(customer.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-900">{customer.name}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {describeCustomerCountry(
                        customer.countryCode,
                        customer.extraData,
                        selectedCompanyCountry,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap gap-2">
                        <button
                          className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                          onClick={() => onViewCustomer(customer)}
                          type="button"
                        >
                          View
                        </button>
                        <button
                          className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                          onClick={() => onEditCustomer(customer)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
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
        <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
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
      className="h-4 w-4 rounded border-slate-300 accent-sky-600"
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
