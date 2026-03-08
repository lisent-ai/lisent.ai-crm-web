import { CompanyWorkspace } from "@/components/dashboard/companies/company-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardCompaniesPage() {
  return (
    <DashboardShell>
      <CompanyWorkspace />
    </DashboardShell>
  );
}
