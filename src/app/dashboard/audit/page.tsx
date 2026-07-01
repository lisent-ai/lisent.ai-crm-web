import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuditLogWorkspace } from "@/components/dashboard/audit/audit-log-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("audit.title"),
    description: t("audit.subtitle"),
  };
}

// Admin-only company audit log. Authorization (owner/super_admin) is enforced
// in the BFF; the workspace shows an access-denied state on a 403.
export default function AuditLogPage() {
  return (
    <DashboardShell>
      <AuditLogWorkspace />
    </DashboardShell>
  );
}
