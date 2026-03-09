"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { signOut, useSessionContext } from "supertokens-auth-react/recipe/session";

import { DashboardHero } from "@/components/dashboard/home/dashboard-hero";
import { DashboardOverview } from "@/components/dashboard/home/dashboard-overview";
import { SessionPanelSkeleton } from "@/components/dashboard/home/session-panel-skeleton";
import {
  ACCOUNT_PROFILE_UPDATED_EVENT,
  getAccountProfile,
} from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

const uiOnlyMode = process.env.NEXT_PUBLIC_UI_ONLY_MODE !== "false";

function SessionDetails() {
  const router = useRouter();
  const session = useSessionContext();
  const isLoading = session.loading;
  const userId = isLoading ? undefined : session.userId;
  const [account, setAccount] = useState<AccountProfile | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let cancelled = false;

    async function loadAccount() {
      try {
        const nextAccount = await getAccountProfile();
        if (!cancelled) {
          setAccount(nextAccount);
        }
      } catch {
        if (!cancelled) {
          setAccount(null);
        }
      }
    }

    function handleAccountUpdated(event: Event) {
      const nextAccount = (event as CustomEvent<AccountProfile>).detail;
      if (!cancelled) {
        setAccount(nextAccount);
      }
    }

    void loadAccount();
    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, handleAccountUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(
        ACCOUNT_PROFILE_UPDATED_EVENT,
        handleAccountUpdated,
      );
    };
  }, [isLoading]);

  async function handleSignOut() {
    await signOut();
    router.replace("/auth/sign-in");
  }

  return (
    <div className="grid gap-6">
      <DashboardHero
        displayName={account?.displayName}
        email={account?.email}
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
