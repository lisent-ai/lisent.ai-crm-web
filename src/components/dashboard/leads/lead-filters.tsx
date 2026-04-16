import { Field } from "@/components/dashboard/customers/customer-ui";

import { leadStatuses } from "./lead-types";
import { SelectField } from "./lead-form-fields";

type LeadFiltersProps = {
  searchQuery: string;
  statusFilter: string;
  sourceFilter: string;
  assigneeFilter: string;
  showOnlyUnassigned: boolean;
  sourceOptions: Array<{ label: string; value: string }>;
  assigneeOptions: Array<{ label: string; value: string }>;
  errorMessage: string | null;
  successMessage: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onShowUnassignedChange: (value: boolean) => void;
};

export function LeadFilters({
  searchQuery,
  statusFilter,
  sourceFilter,
  assigneeFilter,
  showOnlyUnassigned,
  sourceOptions,
  assigneeOptions,
  errorMessage,
  successMessage,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onAssigneeChange,
  onShowUnassignedChange,
}: Readonly<LeadFiltersProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Field
            label="Search"
            onChange={onSearchChange}
            placeholder="Search by name, email, phone, source, note"
            value={searchQuery}
          />
        </div>
        <SelectField
          label="Status"
          onChange={onStatusChange}
          options={[
            { label: "All statuses", value: "all" },
            ...leadStatuses.map((status) => ({ label: status, value: status })),
          ]}
          value={statusFilter}
        />
        <SelectField
          label="Source"
          onChange={onSourceChange}
          options={sourceOptions}
          value={sourceFilter}
        />
        <SelectField
          label="Assignee"
          onChange={onAssigneeChange}
          options={assigneeOptions}
          value={assigneeFilter}
        />
      </div>

      <label className="mt-4 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          checked={showOnlyUnassigned}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          onChange={(event) => onShowUnassignedChange(event.target.checked)}
          type="checkbox"
        />
        Show only unassigned leads
      </label>

      {errorMessage ? (
        <div className="mt-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
    </section>
  );
}
