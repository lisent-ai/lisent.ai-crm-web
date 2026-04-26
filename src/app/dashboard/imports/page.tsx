import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { ImportWorkspace } from "@/components/imports/import-workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.imports.title"),
    description: t("page.imports.description"),
  };
}

export default function DashboardImportsPage() {
  return (
    <DashboardShell>
      <ImportWorkspace />
    </DashboardShell>
  );
}
