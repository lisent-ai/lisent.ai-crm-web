import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { TeamMembersWorkspace } from "@/components/dashboard/team-members/team-members-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.access.title"),
    description: t("page.access.description"),
  };
}

export default function DashboardAccessPage() {
  return (
    <DashboardShell>
      <TeamMembersWorkspace />
    </DashboardShell>
  );
}
