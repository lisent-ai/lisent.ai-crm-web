"use client";

import { useMemo, useSyncExternalStore } from "react";
import { SessionAuth, signOut, useSessionContext } from "supertokens-auth-react/recipe/session";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { SessionPayloadCard } from "@/components/dashboard/session-payload-card";
import { SessionPanelSkeleton } from "@/components/dashboard/session-panel-skeleton";
import { SessionStatusCard } from "@/components/dashboard/session-status-card";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

function SessionDetails() {
  const session = useSessionContext();

  const payload = useMemo(() => {
    if (!session.loading && session.accessTokenPayload) {
      return JSON.stringify(session.accessTokenPayload, null, 2);
    }

    return null;
  }, [session]);

  return (
    <div className="grid gap-6">
      <DashboardHero />

      <div className="grid gap-4 md:grid-cols-2">
        <SessionStatusCard
          doesSessionExist={session.doesSessionExist}
          loading={session.loading}
          onSignOut={() => void signOut()}
          userId={session.userId}
        />
        <SessionPayloadCard payload={payload} />
      </div>
    </div>
  );
}

export function SessionPanel() {
  ensureFrontendSuperTokensInit();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return <SessionPanelSkeleton />;
  }

  return (
    <SessionAuth>
      <SessionDetails />
    </SessionAuth>
  );
}
