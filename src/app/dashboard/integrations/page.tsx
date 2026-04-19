import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { IntegrationsCatalog } from "@/components/dashboard/integrations/integrations-catalog";
import { featureFlags } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

export default function DashboardIntegrationsPage() {
  if (!featureFlags.integrationsHub) {
    notFound();
  }

  return (
    <DashboardShell>
      <IntegrationsCatalog />
    </DashboardShell>
  );
}
