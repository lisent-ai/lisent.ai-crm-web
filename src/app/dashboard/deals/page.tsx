import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DealDirectory } from "@/components/dashboard/deals/deal-directory";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.deals.title"),
    description: t("page.deals.description"),
  };
}

export default function DashboardDealsPage() {
  return (
    <DashboardShell>
      <DealDirectory />
    </DashboardShell>
  );
}
