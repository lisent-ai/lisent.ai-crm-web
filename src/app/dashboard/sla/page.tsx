import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SLAWorkspace } from "@/components/dashboard/sla/sla-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("sla.title"),
    description: t("sla.subtitle"),
  };
}

// Admin-only SLA rules + breach alerts. Authorization (owner / super_admin /
// leads.sla grant) is enforced in the BFF + backend; the workspace shows an
// access-denied state on a 403.
export default function SLAPage() {
  return (
    <DashboardShell>
      <SLAWorkspace />
    </DashboardShell>
  );
}
