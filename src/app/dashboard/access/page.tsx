import { CompanyAccessWorkspace } from "@/components/dashboard/companies/company-access-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardAccessPage() {
  return (
    <DashboardShell>
      <CompanyAccessWorkspace />
    </DashboardShell>
  );
}
