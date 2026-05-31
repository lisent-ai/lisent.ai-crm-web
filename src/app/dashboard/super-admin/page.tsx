import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { SuperAdminPanel } from "@/components/dashboard/super-admin/super-admin-panel";
import { getCurrentAccountServer } from "@/lib/auth/current-account-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("superAdmin.title") };
}

// Super-admin-only page. Server-side gate: non-super-admins never see the
// content (redirected before render). This is the real protection — the
// user-menu button is just discovery.
export default async function SuperAdminPage() {
  const account = await getCurrentAccountServer();
  if (!account) {
    redirect("/auth/sign-in");
  }
  if (!account.access.isSuperAdmin) {
    redirect("/dashboard");
  }
  return (
    <DashboardShell>
      <SuperAdminPanel />
    </DashboardShell>
  );
}
