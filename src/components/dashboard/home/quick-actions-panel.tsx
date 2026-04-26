"use client";

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
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const companyQs = companyId
    ? `?company=${encodeURIComponent(companyId)}${
        companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""
      }`
    : "";

  const rows: ActionRow[] = [
    {
      icon: LayoutGrid,
      title: t("home.quickActions.homeViews.title"),
      description: t("home.quickActions.homeViews.description"),
      ctaLabel: t("home.quickActions.homeViews.cta"),
      tone: "ghost",
    },
    {
      icon: Building2,
      title: t("home.quickActions.newWorkspace.title"),
      description: t("home.quickActions.newWorkspace.description"),
      ctaLabel: t("home.quickActions.newWorkspace.cta"),
      onClick: requestCreateWorkspace,
      tone: "primary",
    },
    {
      icon: Upload,
      title: t("home.quickActions.customerImport.title"),
      description: t("home.quickActions.customerImport.description"),
      ctaLabel: t("home.quickActions.customerImport.cta"),
      href: `/dashboard/imports${companyQs}`,
      tone: "primary",
    },
    {
      icon: Sparkles,
      title: t("home.quickActions.aiQualifier.title"),
      description: t("home.quickActions.aiQualifier.description"),
      ctaLabel: t("home.quickActions.aiQualifier.cta"),
      href: "/dashboard/integrations",
      tone: "primary",
    },
    {
      icon: UserPlus,
      title: t("home.quickActions.inviteMembers.title"),
      description: t("home.quickActions.inviteMembers.description"),
      ctaLabel: t("home.quickActions.inviteMembers.cta"),
      href: `/dashboard/access${companyQs}`,
      tone: "primary",
    },
    {
      icon: Calendar,
      title: t("home.quickActions.scheduleMeeting.title"),
      description: t("home.quickActions.scheduleMeeting.description"),
      ctaLabel: t("home.quickActions.scheduleMeeting.cta"),
      href: `/dashboard/calendar${companyQs}`,
      tone: "primary",
    },
  ];

  return (
    <aside className="flex flex-col gap-4 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t("home.quickActions.title")}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            {t("home.quickActions.subtitle")}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          type="button"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t("home.quickActions.oneClickSetup")}
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
