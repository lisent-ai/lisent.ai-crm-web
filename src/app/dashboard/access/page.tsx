import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { TeamMembersWorkspace } from "@/components/dashboard/team-members/team-members-workspace";

export const dynamic = "force-dynamic";

export default function DashboardAccessPage() {
  return (
    <DashboardShell>
      <TeamMembersWorkspace />
    </DashboardShell>
  );
}
