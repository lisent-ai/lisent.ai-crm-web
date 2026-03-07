import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SessionPanel } from "@/components/dashboard/session-panel";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl">
        <SessionPanel />
      </div>
    </DashboardShell>
  );
}
