import type { Deal, DealStage, DealStageHistory } from "@/lib/crm/client";

import { dealStages } from "./deal-types";

const stageLabelMap = new Map(dealStages.map((stage) => [stage.value, stage.label]));

export function parseDealAmount(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, "."));
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${amount || 0} ${currency || "EUR"}`.trim();
  }
}

export function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeDateInputValue(value: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function formatDateTime(value: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatStageLabel(stage: DealStage) {
  return stageLabelMap.get(stage) ?? stage;
}

export function stageBadgeClasses(stage: DealStage) {
  switch (stage) {
    case "won":
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    case "lost":
      return "border-rose-300 bg-rose-50 text-rose-700";
    case "proposal":
      return "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700";
    case "negotiation":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "qualified":
      return "border-sky-300 bg-sky-50 text-sky-700";
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

export function formatAssigneeLabel(deal: Deal) {
  return deal.assigneeUserName || "Unassigned";
}

export function formatStageDuration(entry: DealStageHistory) {
  const start = new Date(entry.enteredAt);
  const end = entry.exitedAt ? new Date(entry.exitedAt) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }

  const totalMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
