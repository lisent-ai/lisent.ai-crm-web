import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ComingSoonPanel } from "@/components/dashboard/marketing/coming-soon-panel";
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

export default function MarketingEmailPage() {
  if (!featureFlags.marketingModule) {
    notFound();
  }
  return (
    <DashboardShell>
      <MarketingShell active="email">
        <ComingSoonPanel slug="email" />
      </MarketingShell>
    </DashboardShell>
  );
}
