import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AgenciesWorkspace } from "@/components/dashboard/marketing/agencies/agencies-workspace";
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

// Agencies is independent of the Mailchimp flag — operators want to
// manage a partner directory whether or not they ever push to email.
// Gating only behind marketingModule keeps the surface available to
// every tenant on Marketing.
export default function MarketingAgenciesPage() {
  if (!featureFlags.marketingModule) {
    notFound();
  }
  return (
    <DashboardShell>
      <MarketingShell active="agencies">
        <AgenciesWorkspace />
      </MarketingShell>
    </DashboardShell>
  );
}
