import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Lead, LeadStatus } from "@/lib/crm/client";

type RecentLeadsListProps = {
  leads: Lead[];
  companyId: string;
  companyName: string;
  emptyHint?: string;
};

const STATUS_TONE: Record<LeadStatus, { bg: string; color: string; label: string }> = {
  new: { bg: "var(--accent-soft)", color: "var(--accent-strong)", label: "New" },
  contacted: { bg: "#fef3c7", color: "#b45309", label: "Contacted" },
  qualified: { bg: "#d1fae5", color: "#047857", label: "Qualified" },
  lost: { bg: "#fee2e2", color: "#b91c1c", label: "Lost" },
  converted: { bg: "#ede9fe", color: "#6d28d9", label: "Converted" },
};

export function RecentLeadsList({
  leads,
  companyId,
  companyName,
  emptyHint = "Pick a company to see recent leads.",
}: Readonly<RecentLeadsListProps>) {
  const sorted = [...leads]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  const allHref =
    companyId
      ? `/dashboard/leads?company=${encodeURIComponent(companyId)}${
          companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""
        }`
      : "/dashboard/leads";

  return (
    <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Recent leads
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Latest inbound interest
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          href={allHref}
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {emptyHint}
        </div>
      ) : (
        <ul className="mt-4 grid gap-1">
          {sorted.map((lead) => {
            const tone = STATUS_TONE[lead.status];
            const initials = buildInitials(lead.name || lead.email || "?");
            return (
              <li key={lead.id}>
                <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[var(--surface-muted)]">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] text-xs font-semibold text-white"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {lead.name || "Unnamed lead"}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {lead.email || lead.source || "—"}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ background: tone.bg, color: tone.color }}
                  >
                    {tone.label}
                  </span>
                  <span className="hidden w-16 text-right text-xs tabular-nums text-[var(--text-tertiary)] sm:block">
                    {lead.value > 0 ? formatCompact(lead.value) : "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function buildInitials(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatCompact(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(Math.round(value));
  }
}
