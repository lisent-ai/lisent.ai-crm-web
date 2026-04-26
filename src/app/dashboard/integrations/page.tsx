import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { IntegrationsCatalog } from "@/components/dashboard/integrations/integrations-catalog";
import { featureFlags } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.integrations.title"),
    description: t("page.integrations.description"),
  };
}

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
