import { cookies } from "next/headers";
import { cache } from "react";
import { getSSRSession } from "supertokens-node/nextjs";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

import { isSupportedLocale, type SupportedLocale } from "./config";

/**
 * Resolve the signed-in user's saved language preference from
 * SuperTokens user metadata (`profile.language`).
 *
 * Returns null when there's no session, no language set, the value isn't
 * a supported locale, or anything goes wrong talking to SuperTokens — the
 * caller falls back to the cookie/Accept-Language chain in those cases.
 *
 * Memoized per-request via React `cache` so multiple callers in the same
 * render share one round-trip to SuperTokens core. JWT validation itself
 * is local (no network); only `getUserMetadata` hits the core.
 */
export const getAccountLocale = cache(async (): Promise<SupportedLocale | null> => {
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
    const metadata = await UserMetadata.getUserMetadata(sub);
    const profile = metadata.metadata?.profile;
    if (!profile || typeof profile !== "object") {
      return null;
    }
    const language = (profile as { language?: unknown }).language;
    return typeof language === "string" && isSupportedLocale(language)
      ? language
      : null;
  } catch {
    return null;
  }
});
