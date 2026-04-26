import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { IntegrationDetail } from "@/components/dashboard/integrations/integration-detail";
import { featureFlags } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ integration: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { integration } = await params;
  return {
    title: t("page.integrationDetail.title", { slug: integration }),
    description: t("page.integrationDetail.description"),
  };
}

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
