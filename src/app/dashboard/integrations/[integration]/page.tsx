import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { IntegrationDetail } from "@/components/dashboard/integrations/integration-detail";
import { featureFlags } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ integration: string }>;
};

export default async function IntegrationDetailPage({ params }: PageProps) {
  if (!featureFlags.integrationsHub) {
    notFound();
  }
  const { integration } = await params;

  return (
    <DashboardShell>
      <IntegrationDetail slug={integration} />
    </DashboardShell>
  );
}
