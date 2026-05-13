import type { Lead } from "@/lib/crm/client";

export function statusBadgeClasses(status: string) {
  switch (status) {
    case "new":
      return "bg-[var(--surface-inset)] text-[var(--text-secondary)]";
    case "contacted":
      return "bg-[color-mix(in_srgb,_var(--signal-blue)_14%,_var(--surface))] text-[#1e40af]";
    case "qualified":
      return "bg-[color-mix(in_srgb,_var(--signal-green)_14%,_var(--surface))] text-[#065f46]";
    case "disqualified":
      return "bg-[color-mix(in_srgb,_var(--signal-amber)_18%,_var(--surface))] text-[#92400e]";
    case "lost":
      return "bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] text-[#b91c1c]";
    case "converted":
      return "bg-[color-mix(in_srgb,_var(--signal-purple)_14%,_var(--surface))] text-[#6d28d9]";
    default:
      return "bg-[var(--surface-inset)] text-[var(--text-secondary)]";
  }
}

export function formatAssignmentLabel(lead: Lead) {
  if (lead.assigneeUserName) {
    return lead.assignmentMethod === "round_robin"
      ? `${lead.assigneeUserName} · Round robin`
      : lead.assigneeUserName;
  }
  return "Unassigned";
}

export function formatSourceLabel(source: string) {
  return source.trim() || "Unknown source";
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDateTime(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function parseLeadValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bucket items into the last `days` daily buckets (oldest → newest),
 * keyed by the ISO date extracted from `pick`. Missing days are filled
 * with 0 so the returned array always has `days` entries.
 */
export function groupByDay<T>(
  items: readonly T[],
  pick: (item: T) => string | null | undefined,
  days: number,
): number[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = new Array(days).fill(0) as number[];
  for (const item of items) {
    const raw = pick(item);
    if (!raw) continue;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) continue;
    const diffDays = Math.floor((today.getTime() - new Date(t).setHours(0, 0, 0, 0)) / DAY_MS);
    if (diffDays < 0 || diffDays >= days) continue;
    counts[days - 1 - diffDays] += 1;
  }
  return counts;
}

/**
 * Compare last 7 days to the 7 days before that. Returns percent delta,
 * or null when there's not enough signal to compute one.
 */
export function computeLeadTrend(
  items: readonly { createdAt: string }[],
): number | null {
  if (items.length === 0) return null;
  const now = Date.now();
  const weekStart = now - 7 * DAY_MS;
  const prevStart = now - 14 * DAY_MS;
  let current = 0;
  let previous = 0;
  for (const item of items) {
    if (!item.createdAt) continue;
    const t = Date.parse(item.createdAt);
    if (Number.isNaN(t)) continue;
    if (t >= weekStart) current += 1;
    else if (t >= prevStart) previous += 1;
  }
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildLeadCsv(leads: readonly Lead[]): string {
  const headers = [
    "id",
    "name",
    "email",
    "phone",
    "status",
    "source",
    "value",
    "assigneeUserName",
    "assignmentMethod",
    "createdAt",
    "updatedAt",
  ];
  const rows = leads.map((lead) =>
    [
      lead.id,
      lead.name,
      lead.email,
      lead.phone,
      lead.status,
      lead.source,
      lead.value,
      lead.assigneeUserName,
      lead.assignmentMethod,
      lead.createdAt,
      lead.updatedAt,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
