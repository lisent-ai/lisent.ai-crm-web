"use client";

import { isSupportedLocale, type SupportedLocale } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readLocaleCookie(): SupportedLocale | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`),
  );
  if (!match) {
    return null;
  }
  const value = decodeURIComponent(match[1]);
  return isSupportedLocale(value) ? value : null;
}

export function writeLocaleCookie(locale: SupportedLocale): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${COOKIE_NAME}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
