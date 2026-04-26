import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CompanyDashboard } from "@/components/dashboard/home/company-dashboard";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.workspace.title"),
    description: t("page.workspace.description"),
  };
}

export default function DashboardWorkspacePage() {
  return (
    <DashboardShell>
      <CompanyDashboard />
    </DashboardShell>
  );
}
