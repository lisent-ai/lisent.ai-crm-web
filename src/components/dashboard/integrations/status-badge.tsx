import type { IntegrationStatus } from "@/lib/crm/client";

type BadgeStyle = {
  label: string;
  className: string;
};

const BADGES: Record<IntegrationStatus, BadgeStyle> = {
  active: {
    label: "Active",
    className:
      "border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] text-[var(--signal-green)]",
  },
  not_configured: {
    label: "Not configured",
    className:
      "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  },
  paused: {
    label: "Paused",
    className:
      "border-[color-mix(in_srgb,_var(--signal-amber)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] text-[var(--signal-amber)]",
  },
  error: {
    label: "Error",
    className:
      "border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))] text-[var(--signal-red)]",
  },
  coming_soon: {
    label: "Coming soon",
    className:
      "border-[color-mix(in_srgb,_var(--accent)_24%,_transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  },
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const badge = BADGES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
      role="status"
      aria-label={`Integration status: ${badge.label}`}
    >
      <span aria-hidden="true">●</span>
      {badge.label}
    </span>
  );
}
