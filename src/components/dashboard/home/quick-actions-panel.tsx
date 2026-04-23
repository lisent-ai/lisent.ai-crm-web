import Link from "next/link";
import {
  Building2,
  Calendar,
  LayoutGrid,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { requestCreateWorkspace } from "@/components/dashboard/shared/create-workspace-modal";

type QuickActionsPanelProps = {
  companyId: string;
  companyName: string;
};

type ActionRow = {
  icon: ComponentType<LucideProps>;
  title: string;
  description: string;
  ctaLabel: string;
  badge?: string;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "ghost";
};

export function QuickActionsPanel({ companyId, companyName }: Readonly<QuickActionsPanelProps>) {
  const companyQs = companyId
    ? `?company=${encodeURIComponent(companyId)}${
        companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""
      }`
    : "";

  const rows: ActionRow[] = [
    {
      icon: LayoutGrid,
      title: "Home views",
      description: "Your workspace overview",
      ctaLabel: "Customized",
      tone: "ghost",
    },
    {
      icon: Building2,
      title: "New workspace",
      description: "Spin up a fresh environment",
      ctaLabel: "Create",
      onClick: requestCreateWorkspace,
      tone: "primary",
    },
    {
      icon: Upload,
      title: "Customer import",
      description: "Bulk CSV import flow",
      ctaLabel: "Import",
      href: `/dashboard/imports${companyQs}`,
      tone: "primary",
    },
    {
      icon: Sparkles,
      title: "AI Qualifier",
      description: "Auto-score incoming leads",
      ctaLabel: "Configure",
      href: "/dashboard/integrations",
      tone: "primary",
    },
    {
      icon: UserPlus,
      title: "Invite members",
      description: "Add teammates to this workspace",
      ctaLabel: "Invite",
      href: `/dashboard/access${companyQs}`,
      tone: "primary",
    },
    {
      icon: Calendar,
      title: "Schedule meeting",
      description: "Start planning now",
      ctaLabel: "Schedule",
      href: `/dashboard/calendar${companyQs}`,
      tone: "primary",
    },
  ];

  return (
    <aside className="flex flex-col gap-4 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Start here
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Set up your workspace in a few clicks
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          type="button"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          1-click setup
        </button>
      </div>

      <div className="grid divide-y divide-[var(--border-subtle)]">
        {rows.map((row) => (
          <ActionRowView key={row.title} row={row} />
        ))}
      </div>
    </aside>
  );
}

function ActionRowView({ row }: Readonly<{ row: ActionRow }>) {
  const Icon = row.icon;
  const ctaClass =
    row.tone === "ghost"
      ? "rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)]"
      : "rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)]";

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {row.title}
        </p>
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {row.description}
        </p>
      </div>
      {row.href ? (
        <Link className={ctaClass} href={row.href}>
          {row.ctaLabel}
        </Link>
      ) : row.onClick ? (
        <button className={ctaClass} onClick={row.onClick} type="button">
          {row.ctaLabel}
        </button>
      ) : (
        <span className={ctaClass}>{row.ctaLabel}</span>
      )}
    </div>
  );
}
