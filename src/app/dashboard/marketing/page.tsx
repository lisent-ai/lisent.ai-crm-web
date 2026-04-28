import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

import { featureFlags } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

// Canonical /dashboard/marketing route: redirects to the Campaigns subpage
// so the URL stays stable when we add Forms/Email content later. The active
// company query param is preserved so the workspace switcher in AppShell
// keeps working across the redirect.
export default async function DashboardMarketingIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!featureFlags.marketingModule) {
    notFound();
  }
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") {
      params.set(k, v);
    }
  }
  const qs = params.toString();
  redirect(`/dashboard/marketing/campaigns${qs ? `?${qs}` : ""}`);
}
