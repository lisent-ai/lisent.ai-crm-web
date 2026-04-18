import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { TaskWorkspace } from "@/components/dashboard/tasks/task-workspace";

export const dynamic = "force-dynamic";

export default function DashboardTasksPage() {
  return (
    <DashboardShell>
      <TaskWorkspace />
    </DashboardShell>
  );
}
