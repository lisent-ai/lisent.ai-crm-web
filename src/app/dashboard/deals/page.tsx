import { DealDirectory } from "@/components/dashboard/deals/deal-directory";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardDealsPage() {
  return (
    <DashboardShell>
      <DealDirectory />
    </DashboardShell>
  );
}
