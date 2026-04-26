import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CalendarWorkspace } from "@/components/dashboard/calendar/calendar-workspace";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.calendar.title"),
    description: t("page.calendar.description"),
  };
}

export default function DashboardCalendarPage() {
  return (
    <DashboardShell>
      <CalendarWorkspace />
    </DashboardShell>
  );
}
