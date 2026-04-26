import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CustomerDirectory } from "@/components/dashboard/customers/customer-directory";
import { DashboardShell } from "@/components/dashboard/shared/dashboard-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("page.customers.title"),
    description: t("page.customers.description"),
  };
}

export default function DashboardCustomersPage() {
  return (
    <DashboardShell>
      <CustomerDirectory />
    </DashboardShell>
  );
}
