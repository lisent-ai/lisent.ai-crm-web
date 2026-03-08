import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";
import { ImportWorkspace } from "@/components/imports/import-workspace";

export const dynamic = "force-dynamic";

export default function DashboardImportsPage() {
  return (
    <DashboardShell>
      <ImportWorkspace />
    </DashboardShell>
  );
}
