import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountSettings } from "@/components/dashboard/account/account-settings";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.account.title"),
    description: t("page.account.description"),
  };
}

export default function AccountSettingsPage() {
  return (
    <DashboardShell>
      <AccountSettings />
    </DashboardShell>
  );
}
