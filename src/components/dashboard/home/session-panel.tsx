"use client";

import { useSyncExternalStore } from "react";

import { DashboardOverview } from "@/components/dashboard/home/dashboard-overview";
import { SessionPanelSkeleton } from "@/components/dashboard/home/session-panel-skeleton";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE === "true";

export function SessionPanel() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (uiOnlyMode) {
    return <DashboardOverview />;
  }

  ensureFrontendSuperTokensInit();

  if (!mounted) {
    return <SessionPanelSkeleton />;
  }

  return <DashboardOverview />;
}
