import { cookies } from "next/headers";
import { cache } from "react";
import { getSSRSession } from "supertokens-node/nextjs";

import type { AccountProfile } from "@/lib/auth/account-profile";
import { loadAccountProfile } from "@/lib/auth/account-server";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

// Server-side current account for protected pages (e.g. the super-admin
// gate). Returns null when there's no valid session. Memoized per request
// so multiple gate checks in one render share a single core round-trip.
export const getCurrentAccountServer = cache(
  async (): Promise<AccountProfile | null> => {
    try {
      ensureBackendSuperTokensInit();
      const cookieStore = await cookies();
      const cookiePairs = cookieStore
        .getAll()
        .map(({ name, value }) => ({ name, value }));
      const ssr = await getSSRSession(cookiePairs);
      if (!ssr.hasToken || ssr.error || !ssr.accessTokenPayload) {
        return null;
      }
      const sub = ssr.accessTokenPayload.sub;
      if (typeof sub !== "string" || sub.length === 0) {
        return null;
      }
      return await loadAccountProfile(sub);
    } catch {
      return null;
    }
  },
);
