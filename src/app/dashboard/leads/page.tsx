import { LeadDirectory } from "@/components/dashboard/leads/lead-directory";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardLeadsPage() {
  return (
    <DashboardShell>
      <LeadDirectory />
    </DashboardShell>
  );
}
