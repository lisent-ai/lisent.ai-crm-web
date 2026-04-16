import type { CompanyMember } from "@/lib/auth/company-membership-client";

import { dealStages } from "./deal-types";

type DealFiltersProps = {
  searchQuery: string;
  stageFilter: string;
  assigneeFilter: string;
  members: CompanyMember[];
  onSearchQueryChange: (value: string) => void;
  onStageFilterChange: (value: string) => void;
  onAssigneeFilterChange: (value: string) => void;
};

export function DealFilters({
  searchQuery,
  stageFilter,
  assigneeFilter,
  members,
  onSearchQueryChange,
  onStageFilterChange,
  onAssigneeFilterChange,
}: Readonly<DealFiltersProps>) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(200px,0.8fr)_minmax(200px,0.8fr)]">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Search</span>
          <input
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Deal name, assignee, won/lost reason..."
            value={searchQuery}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Stage</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
            onChange={(event) => onStageFilterChange(event.target.value)}
            value={stageFilter}
          >
            <option value="all">All stages</option>
            {dealStages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Assignee</span>
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
            onChange={(event) => onAssigneeFilterChange(event.target.value)}
            value={assigneeFilter}
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName || member.email}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
