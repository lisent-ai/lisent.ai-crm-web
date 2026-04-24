import type { LeadStatus } from "@/lib/crm/client";

import { leadStatuses } from "./lead-types";

type StatusTabOption = {
  value: string;
  label: string;
  count: number;
};

type LeadStatusTabsProps = {
  value: string;
  onChange: (next: string) => void;
  counts: ReadonlyArray<{ status: LeadStatus; count: number }>;
  totalCount: number;
  assignedToMeCount: number;
  assignedToMeDisabled?: boolean;
};

const LABELS: Record<string, string> = {
  all: "All",
  assigned_to_me: "Assigned to me",
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  lost: "Lost",
  converted: "Converted",
};

export function LeadStatusTabs({
  value,
  onChange,
  counts,
  totalCount,
  assignedToMeCount,
  assignedToMeDisabled = false,
}: Readonly<LeadStatusTabsProps>) {
  const options: StatusTabOption[] = [
    { value: "all", label: LABELS.all ?? "All", count: totalCount },
    {
      value: "assigned_to_me",
      label: LABELS.assigned_to_me ?? "Assigned to me",
      count: assignedToMeCount,
    },
    ...leadStatuses.map((status) => ({
      value: status,
      label: LABELS[status] ?? status,
      count: counts.find((c) => c.status === status)?.count ?? 0,
    })),
  ];

  return (
    <div
      aria-label="Filter leads by status"
      className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto"
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        const disabled = option.value === "assigned_to_me" && assignedToMeDisabled;
        return (
          <button
            aria-selected={active}
            className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition ${
              disabled
                ? "cursor-not-allowed text-[var(--text-muted)]"
                : ""
            } ${
              active
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
            disabled={disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
            <span
              className={`inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${
                active
                  ? "bg-[var(--text-primary)] text-white"
                  : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
              }`}
            >
              {option.count}
            </span>
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
