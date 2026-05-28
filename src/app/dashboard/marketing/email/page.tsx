import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ComingSoonPanel } from "@/components/dashboard/marketing/coming-soon-panel";
import { EmailWorkspace } from "@/components/dashboard/marketing/email/email-workspace";
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
  // Mailchimp flag gates the live workspace; when it is off we fall back
  // to the original "Coming Soon" placeholder so non-Mailchimp tenants
  // see a sensible empty state until they enable it per-deploy.
  const body = featureFlags.mailchimpIntegration ? (
    <EmailWorkspace />
  ) : (
    <ComingSoonPanel slug="email" />
  );
  return (
    <DashboardShell>
      <MarketingShell active="email">{body}</MarketingShell>
    </DashboardShell>
  );
}
