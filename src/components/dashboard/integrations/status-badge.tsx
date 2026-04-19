import type { IntegrationStatus } from "@/lib/crm/client";

type BadgeStyle = {
  label: string;
  className: string;
};

const BADGES: Record<IntegrationStatus, BadgeStyle> = {
  active: {
    label: "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  not_configured: {
    label: "Not configured",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  paused: {
    label: "Paused",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  error: {
    label: "Error",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  coming_soon: {
    label: "Coming soon",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
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
