import type { ComponentType } from "react";

import {
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  Gauge,
  LayoutDashboard,
  Plug,
  Target,
  Upload,
  User,
  Users,
  type LucideProps,
} from "lucide-react";

import { featureFlags } from "@/config/feature-flags";

type IconComponent = ComponentType<LucideProps>;

export type NavPlacement = "top" | "side";

export type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  placement: NavPlacement;
  /** Appends the `company` (and optional `companyName`) query param when one is selected. */
  carriesCompany: boolean;
  /** Feature-flag gated visibility. */
  visible: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, placement: "top", carriesCompany: false, visible: true },
  { href: "/dashboard/workspace", label: "Dashboard", icon: Gauge, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/companies", label: "Companies", icon: Building2, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/leads", label: "Leads", icon: Target, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/deals", label: "Deals", icon: Briefcase, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/customers", label: "Customers", icon: User, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, placement: "side", carriesCompany: true, visible: true },
  { href: "/dashboard/access", label: "Team Members", icon: Users, placement: "side", carriesCompany: true, visible: true },
  { href: "/dashboard/imports", label: "Customer Import", icon: Upload, placement: "side", carriesCompany: true, visible: true },
  {
    href: "/dashboard/integrations",
    label: "Integrations",
    icon: Plug,
    placement: "side",
    carriesCompany: true,
    visible: featureFlags.integrationsHub,
  },
];

export function buildNavHref(
  item: Pick<NavItem, "href" | "carriesCompany">,
  companyId: string,
  companyName: string,
): string {
  if (!item.carriesCompany || !companyId) {
    return item.href;
  }
  const search = new URLSearchParams({ company: companyId });
  if (companyName) {
    search.set("companyName", companyName);
  }
  return `${item.href}?${search.toString()}`;
}

export function getTopNavItems(): NavItem[] {
  return navItems.filter((item) => item.placement === "top" && item.visible);
}

export function getSideNavItems(): NavItem[] {
  return navItems.filter((item) => item.placement === "side" && item.visible);
}

/**
 * Active-state test. Exact match for Overview (/dashboard); prefix match for nested routes.
 */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
