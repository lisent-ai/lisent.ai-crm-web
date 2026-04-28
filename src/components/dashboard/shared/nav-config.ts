import type { ComponentType } from "react";

import {
  Briefcase,
  Calendar,
  CheckSquare,
  Gauge,
  LayoutDashboard,
  Megaphone,
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

export type NavLabelKey =
  | "nav.overview"
  | "nav.dashboard"
  | "nav.leads"
  | "nav.deals"
  | "nav.customers"
  | "nav.tasks"
  | "nav.marketing"
  | "nav.calendar"
  | "nav.teamMembers"
  | "nav.customerImport"
  | "nav.integrations";

export type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: IconComponent;
  placement: NavPlacement;
  carriesCompany: boolean;
  visible: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, placement: "top", carriesCompany: false, visible: true },
  { href: "/dashboard/workspace", labelKey: "nav.dashboard", icon: Gauge, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/leads", labelKey: "nav.leads", icon: Target, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/deals", labelKey: "nav.deals", icon: Briefcase, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/customers", labelKey: "nav.customers", icon: User, placement: "top", carriesCompany: true, visible: true },
  { href: "/dashboard/tasks", labelKey: "nav.tasks", icon: CheckSquare, placement: "top", carriesCompany: true, visible: true },
  {
    href: "/dashboard/marketing",
    labelKey: "nav.marketing",
    icon: Megaphone,
    placement: "top",
    carriesCompany: true,
    visible: featureFlags.marketingModule,
  },
  { href: "/dashboard/calendar", labelKey: "nav.calendar", icon: Calendar, placement: "side", carriesCompany: true, visible: true },
  { href: "/dashboard/access", labelKey: "nav.teamMembers", icon: Users, placement: "side", carriesCompany: true, visible: true },
  { href: "/dashboard/imports", labelKey: "nav.customerImport", icon: Upload, placement: "side", carriesCompany: true, visible: true },
  {
    href: "/dashboard/integrations",
    labelKey: "nav.integrations",
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

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
