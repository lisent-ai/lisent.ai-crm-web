import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LeadDirectory } from "@/components/dashboard/leads/lead-directory";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.leads.title"),
    description: t("page.leads.description"),
  };
}

export default function DashboardLeadsPage() {
  return (
    <DashboardShell>
      <LeadDirectory />
    </DashboardShell>
  );
}
