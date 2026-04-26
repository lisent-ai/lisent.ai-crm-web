import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

import { SuperTokensProvider } from "@/components/auth/supertokens-provider";
import {
  defaultLocale,
  isRtl,
  isSupportedLocale,
} from "@/lib/i18n/config";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://lisent.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Lisent CRM",
  description: "Tenant-aware CRM web app for Lisent",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawLocale = await getLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SuperTokensProvider>{children}</SuperTokensProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
