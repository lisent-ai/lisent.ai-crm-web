"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

type MarketingTab = "campaigns" | "forms" | "email" | "agencies";

type MarketingShellProps = {
  active: MarketingTab;
  children: React.ReactNode;
};

const tabs: ReadonlyArray<{ key: MarketingTab; href: string; labelKey: string }> = [
  { key: "campaigns", href: "/dashboard/marketing/campaigns", labelKey: "marketing.tabs.campaigns" },
  { key: "forms", href: "/dashboard/marketing/forms", labelKey: "marketing.tabs.forms" },
  { key: "email", href: "/dashboard/marketing/email", labelKey: "marketing.tabs.email" },
  { key: "agencies", href: "/dashboard/marketing/agencies", labelKey: "marketing.tabs.agencies" },
];

// MarketingShell renders the page header + sub-tab strip (Bitrix24 / HubSpot
// style) with Campaigns as the only fully-functional tab in Phase 1. Forms
// and Email are coming-soon placeholders so the IA is in place when those
// modules ship later. Tabs are rendered as Links so the URL is the source
// of truth for the active sub-route — same pattern the rest of dashboard
// uses for stable deep-links.
export function MarketingShell({ active, children }: Readonly<MarketingShellProps>) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  // Preserve company query params across tab switches so the active
  // workspace sticks.
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t("page.marketing.title")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("page.marketing.description")}
        </p>
      </header>
      <nav
        aria-label={t("marketing.tabs.aria")}
        className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              aria-selected={isActive}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition ${
                isActive
                  ? "font-semibold text-[var(--text-primary)]"
                  : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
              href={`${tab.href}${suffix}`}
              key={tab.key}
              role="tab"
            >
              {t(tab.labelKey as never)}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
                />
              )}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}
