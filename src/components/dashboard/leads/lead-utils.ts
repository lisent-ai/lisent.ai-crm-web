import type { Lead } from "@/lib/crm/client";

export function statusBadgeClasses(status: string) {
  switch (status) {
    case "new":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "contacted":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "qualified":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "lost":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "converted":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
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
