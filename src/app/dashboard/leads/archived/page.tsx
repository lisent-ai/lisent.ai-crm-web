import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ArchivedLeadsWorkspace } from "@/components/dashboard/leads/archived-leads-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("leads.archived.title"),
    description: t("leads.archived.subtitle"),
  };
}

// Admin-only archived leads. The real access gate lives in the backend
// (owner or leads.archive privilege) — the workspace renders an access-denied
// state on a 403 rather than leaking data.
export default function ArchivedLeadsPage() {
  return (
    <DashboardShell>
      <ArchivedLeadsWorkspace />
    </DashboardShell>
  );
}
