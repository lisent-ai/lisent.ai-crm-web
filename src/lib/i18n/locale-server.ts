import { cookies, headers } from "next/headers";

import {
  isSupportedLocale,
  parseAcceptLanguage,
  type SupportedLocale,
} from "./config";

export async function getServerLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie && isSupportedLocale(fromCookie)) {
    return fromCookie;
  }
  const accept = (await headers()).get("accept-language") ?? "";
  return parseAcceptLanguage(accept);
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function buildLocaleCookieHeader(locale: SupportedLocale): string {
  return `NEXT_LOCALE=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
