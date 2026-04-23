import { CompanyDashboard } from "@/components/dashboard/home/company-dashboard";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardWorkspacePage() {
  return (
    <DashboardShell>
      <CompanyDashboard />
    </DashboardShell>
  );
}
