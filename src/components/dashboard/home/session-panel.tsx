"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { signOut, useSessionContext } from "supertokens-auth-react/recipe/session";

import { DashboardHero } from "@/components/dashboard/home/dashboard-hero";
import { DashboardOverview } from "@/components/dashboard/home/dashboard-overview";
import { SessionPanelSkeleton } from "@/components/dashboard/home/session-panel-skeleton";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE !== "false";

function SessionDetails() {
  const router = useRouter();
  const session = useSessionContext();
  const isLoading = session.loading;
  const userId = isLoading ? undefined : session.userId;

  async function handleSignOut() {
    await signOut();
    router.replace("/auth/sign-in");
  }

  return (
    <div className="grid gap-6">
      <DashboardHero
        onSignOut={() => void handleSignOut()}
        userId={isLoading ? undefined : userId}
      />
      <DashboardOverview />
    </div>
  );
}

function DemoDetails() {
  return (
    <div className="grid gap-6">
      <DashboardHero demoMode userId="demo-user@lisent.ai" />
      <DashboardOverview />
    </div>
  );
}

export function SessionPanel() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (uiOnlyMode) {
    return <DemoDetails />;
  }

  ensureFrontendSuperTokensInit();

  if (!mounted) {
    return <SessionPanelSkeleton />;
  }

  return <SessionDetails />;
}
