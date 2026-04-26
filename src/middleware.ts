import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import {
  defaultLocale,
  isSupportedLocale,
  locales,
  parseAcceptLanguage,
} from "@/lib/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});

const COOKIE_ONLY_PREFIXES = ["/dashboard", "/auth", "/api"];

function isCookieOnlyPath(pathname: string): boolean {
  return COOKIE_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function ensureLocaleCookie(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (existing && isSupportedLocale(existing)) {
    return response;
  }
  const accept = request.headers.get("accept-language") ?? "";
  const detected = parseAcceptLanguage(accept);
  response.cookies.set(LOCALE_COOKIE, detected, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  return response;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isCookieOnlyPath(pathname)) {
    return ensureLocaleCookie(request, NextResponse.next());
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
