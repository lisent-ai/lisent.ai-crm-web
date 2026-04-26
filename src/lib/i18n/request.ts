import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { getAccountLocale } from "./account-locale-server";
import {
  defaultLocale,
  isSupportedLocale,
  parseAcceptLanguage,
  type SupportedLocale,
} from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: SupportedLocale = defaultLocale;

  // Authenticated users always render in their saved account language.
  // This overrides the URL/cookie/browser fallbacks so a fresh browser
  // on a new device respects the preference even before the user visits
  // the settings page on that device to re-save it.
  const accountLocale = await getAccountLocale();
  if (accountLocale) {
    locale = accountLocale;
  } else {
    const fromRequest = await requestLocale;
    if (fromRequest && isSupportedLocale(fromRequest)) {
      locale = fromRequest;
    } else {
      const cookieStore = await cookies();
      const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
      if (fromCookie && isSupportedLocale(fromCookie)) {
        locale = fromCookie;
      } else {
        const accept = (await headers()).get("accept-language") ?? "";
        locale = parseAcceptLanguage(accept);
      }
    }
  }

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../../messages/${defaultLocale}.json`)).default;
    locale = defaultLocale;
  }

  return { locale, messages };
});
