import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  isSupportedLocale,
  parseAcceptLanguage,
  type SupportedLocale,
} from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: SupportedLocale = defaultLocale;

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

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../../messages/${defaultLocale}.json`)).default;
    locale = defaultLocale;
  }

  return { locale, messages };
});
