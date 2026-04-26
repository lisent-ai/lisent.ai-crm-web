"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { HelpCircle, Plus } from "lucide-react";

import {
  buildNavHref,
  getSideNavItems,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/shared/nav-config";

type AppSidebarProps = {
  companyId: string;
  companyName: string;
};

export function AppSidebar({ companyId, companyName }: Readonly<AppSidebarProps>) {
  const pathname = usePathname();
  const t = useTranslations();
  const items = getSideNavItems();

  return (
    <aside className="sticky top-0 hidden h-screen w-[80px] shrink-0 flex-col items-center gap-2 border-e border-[var(--border-subtle)] bg-[var(--surface)] py-4 md:flex">
      <Link
        aria-label={t("nav.lisentWorkspace")}
        className="flex h-14 w-14 items-center justify-center rounded-[14px] transition hover:bg-[var(--surface-muted)]"
        href="/dashboard"
      >
        <Image
          alt="Lisent"
          className="h-auto w-14"
          height={38}
          priority
          src="/lisent-logo.png"
          width={68}
        />
      </Link>

      <div className="mt-4 flex flex-1 flex-col items-center gap-1">
        {items.map((item) => (
          <SidebarIconLink
            companyId={companyId}
            companyName={companyName}
            item={item}
            key={item.href}
            pathname={pathname}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pb-1">
        <SidebarIconButton
          ariaLabel={t("nav.help")}
          icon={<HelpCircle className="h-[18px] w-[18px]" />}
        />
        <SidebarIconButton
          ariaLabel={t("nav.quickCreate")}
          icon={<Plus className="h-[18px] w-[18px]" />}
          tone="accent"
        />
      </div>
    </aside>
  );
}

function SidebarIconLink({
  item,
  pathname,
  companyId,
  companyName,
}: Readonly<{
  item: NavItem;
  pathname: string;
  companyId: string;
  companyName: string;
}>) {
  const t = useTranslations();
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href);
  const href = buildNavHref(item, companyId, companyName);
  const label = t(item.labelKey);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-[12px] transition ${
        active
          ? "bg-[var(--surface-inset)] text-[var(--text-primary)]"
          : "text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      }`}
      href={href}
      title={label}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className="pointer-events-none absolute start-full top-1/2 z-30 ms-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--text-primary)] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-[var(--shadow-md)] transition group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

function SidebarIconButton({
  ariaLabel,
  icon,
  tone = "muted",
}: Readonly<{
  ariaLabel: string;
  icon: React.ReactNode;
  tone?: "muted" | "accent";
}>) {
  const base =
    "flex h-10 w-10 items-center justify-center rounded-[12px] transition";
  const palette =
    tone === "accent"
      ? "bg-[var(--text-primary)] text-white hover:opacity-90"
      : "text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
  return (
    <button
      aria-label={ariaLabel}
      className={`${base} ${palette}`}
      title={ariaLabel}
      type="button"
    >
      {icon}
    </button>
  );
}
