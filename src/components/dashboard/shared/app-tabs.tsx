"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  buildNavHref,
  getTopNavItems,
  isNavActive,
} from "@/components/dashboard/shared/nav-config";

type AppTabsProps = {
  companyId: string;
  companyName: string;
};

export function AppTabs({ companyId, companyName }: Readonly<AppTabsProps>) {
  const pathname = usePathname();
  const items = getTopNavItems();

  return (
    <nav
      aria-label="Primary"
      className="scrollbar-thin -mb-px flex min-w-0 items-center gap-1 overflow-x-auto"
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        const href = buildNavHref(item, companyId, companyName);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap px-3 py-3 text-sm transition ${
              active
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
            href={href}
            key={item.href}
          >
            {item.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
