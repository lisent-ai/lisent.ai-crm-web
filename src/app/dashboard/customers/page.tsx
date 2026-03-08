import { CustomerDirectory } from "@/components/dashboard/customers/customer-directory";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardCustomersPage() {
  return (
    <DashboardShell>
      <CustomerDirectory />
    </DashboardShell>
  );
}
