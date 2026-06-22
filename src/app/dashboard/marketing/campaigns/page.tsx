import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CampaignAutoAssign } from "@/components/dashboard/marketing/campaign-auto-assign";
import { CampaignsOverview } from "@/components/dashboard/marketing/campaigns-overview";
import { MarketingShell } from "@/components/dashboard/marketing/marketing-shell";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { featureFlags } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.marketing.title"),
    description: t("page.marketing.description"),
  };
}

export default function MarketingCampaignsPage() {
  if (!featureFlags.marketingModule) {
    notFound();
  }
  return (
    <DashboardShell>
      <MarketingShell active="campaigns">
        <div className="flex flex-col gap-8">
          <CampaignAutoAssign />
          <CampaignsOverview />
        </div>
      </MarketingShell>
    </DashboardShell>
  );
}
