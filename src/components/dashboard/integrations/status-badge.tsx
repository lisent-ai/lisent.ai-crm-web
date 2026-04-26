"use client";

import { useTranslations } from "next-intl";

import type { IntegrationStatus } from "@/lib/crm/client";

const BADGE_CLASSES: Record<IntegrationStatus, string> = {
  active:
    "border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] text-[var(--signal-green)]",
  not_configured:
    "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  paused:
    "border-[color-mix(in_srgb,_var(--signal-amber)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] text-[var(--signal-amber)]",
  error:
    "border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))] text-[var(--signal-red)]",
  coming_soon:
    "border-[color-mix(in_srgb,_var(--accent)_24%,_transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
};

const STATUS_KEYS: Record<IntegrationStatus, string> = {
  active: "integrations.status.active",
  not_configured: "integrations.status.notConfigured",
  paused: "integrations.status.paused",
  error: "integrations.status.error",
  coming_soon: "integrations.status.comingSoon",
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const t = useTranslations();
  const className = BADGE_CLASSES[status];
  const label = t(STATUS_KEYS[status] as never);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
      role="status"
      aria-label={t("integrations.status.aria", { label })}
    >
      <span aria-hidden="true">●</span>
      {label}
    </span>
  );
}
