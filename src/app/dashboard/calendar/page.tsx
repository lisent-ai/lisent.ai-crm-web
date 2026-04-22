import { CalendarWorkspace } from "@/components/dashboard/calendar/calendar-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function DashboardCalendarPage() {
  return (
    <DashboardShell>
      <CalendarWorkspace />
    </DashboardShell>
  );
}
