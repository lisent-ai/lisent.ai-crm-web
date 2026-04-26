import type { Deal, DealStage, DealStageHistory } from "@/lib/crm/client";

import { dealStageOptions } from "./deal-types";

const stageLabelKeyMap = new Map(dealStageOptions.map((stage) => [stage.value, stage.labelKey]));

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

export function getStageLabelKey(stage: DealStage) {
  return stageLabelKeyMap.get(stage) ?? `deals.stage.${stage}`;
}

export function stageBadgeClasses(stage: DealStage) {
  switch (stage) {
    case "won":
      return "border-[color-mix(in_srgb,_var(--signal-green)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] text-[var(--signal-green)]";
    case "lost":
      return "border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))] text-[var(--signal-red)]";
    case "proposal":
      return "border-[color-mix(in_srgb,_var(--signal-purple)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-purple)_10%,_var(--surface))] text-[var(--signal-purple)]";
    case "negotiation":
      return "border-[color-mix(in_srgb,_var(--signal-amber)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_12%,_var(--surface))] text-[#92400e]";
    case "qualified":
      return "border-[color-mix(in_srgb,_var(--accent)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--accent)_10%,_var(--surface))] text-[var(--accent-strong)]";
    default:
      return "border-[var(--border-default)] bg-[var(--surface-inset)] text-[var(--text-secondary)]";
  }
}

export function buildInitials(value: string) {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "?";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

export function formatShortDate(value: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
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
