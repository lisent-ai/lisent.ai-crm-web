import { AccountSettings } from "@/components/dashboard/account/account-settings";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export default function AccountSettingsPage() {
  return (
    <DashboardShell>
      <AccountSettings />
    </DashboardShell>
  );
}
