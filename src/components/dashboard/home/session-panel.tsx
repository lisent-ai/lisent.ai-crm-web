"use client";

import { useSyncExternalStore } from "react";

import { SessionPanelSkeleton } from "@/components/dashboard/home/session-panel-skeleton";
import { WorkspaceOverview } from "@/components/dashboard/home/workspace-overview";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE === "true";

export function SessionPanel() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (uiOnlyMode) {
    return <WorkspaceOverview />;
  }

  ensureFrontendSuperTokensInit();

  if (!mounted) {
    return <SessionPanelSkeleton />;
  }

  return <WorkspaceOverview />;
}
