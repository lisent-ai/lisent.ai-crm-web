import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { TaskWorkspace } from "@/components/dashboard/tasks/task-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.tasks.title"),
    description: t("page.tasks.description"),
  };
}

export default function DashboardTasksPage() {
  return (
    <DashboardShell>
      <TaskWorkspace />
    </DashboardShell>
  );
}
