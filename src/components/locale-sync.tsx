"use client";

import { useEffect } from "react";

import {
  readLocaleCookie,
  writeLocaleCookie,
} from "@/lib/i18n/locale-client";
import type { SupportedLocale } from "@/lib/i18n/config";

/**
 * Mounts in the root layout to keep the `NEXT_LOCALE` cookie aligned with
 * the locale the server resolved for this render (which may have come from
 * the user's account preference rather than the cookie itself).
 *
 * The server always picks the right locale for SSR; this component only
 * matters for code that reads the cookie client-side later.
 */
export function LocaleSync({
  currentLocale,
}: {
  currentLocale: SupportedLocale;
}) {
  useEffect(() => {
    if (readLocaleCookie() !== currentLocale) {
      writeLocaleCookie(currentLocale);
    }
  }, [currentLocale]);

  return null;
}
