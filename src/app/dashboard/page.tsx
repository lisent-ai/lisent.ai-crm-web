import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SessionPanel } from "@/components/dashboard/home/session-panel";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.dashboard.title"),
    description: t("page.dashboard.description"),
  };
}

export default function DashboardPage() {
  return (
    <DashboardShell>
      <SessionPanel />
    </DashboardShell>
  );
}
