"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

import {
  buildNavHref,
  getSideNavItems,
  getTopNavItems,
  isNavActive,
  type NavItem,
} from "@/components/dashboard/shared/nav-config";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
};

export function MobileDrawer({
  open,
  onClose,
  companyId,
  companyName,
}: Readonly<MobileDrawerProps>) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const topItems = getTopNavItems();
  const sideItems = getSideNavItems();

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}
    >
      <button
        aria-label="Close navigation"
        className={`absolute inset-0 bg-[rgba(11,15,25,0.45)] transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        type="button"
      />

      <aside
        aria-label="Navigation"
        className={`absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col bg-[var(--surface)] shadow-[var(--shadow-float)] transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-4">
          <div className="flex items-center gap-2">
            <Image
              alt="Lisent"
              className="h-auto w-14"
              height={34}
              priority
              src="/lisent-logo.png"
              width={60}
            />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Lisent CRM
            </span>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <DrawerSection label="Workspace" items={topItems} pathname={pathname} companyId={companyId} companyName={companyName} onNavigate={onClose} />
          {sideItems.length > 0 && (
            <DrawerSection
              className="mt-4"
              label="Tools"
              items={sideItems}
              pathname={pathname}
              companyId={companyId}
              companyName={companyName}
              onNavigate={onClose}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({
  label,
  items,
  pathname,
  companyId,
  companyName,
  onNavigate,
  className = "",
}: Readonly<{
  label: string;
  items: NavItem[];
  pathname: string;
  companyId: string;
  companyName: string;
  onNavigate: () => void;
  className?: string;
}>) {
  return (
    <div className={className}>
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </p>
      <div className="grid gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          const href = buildNavHref(item, companyId, companyName);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[var(--surface-inset)] font-semibold text-[var(--text-primary)]"
                  : "font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              }`}
              href={href}
              key={item.href}
              onClick={onNavigate}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
