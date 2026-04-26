import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

import { SuperTokensProvider } from "@/components/auth/supertokens-provider";
import { LocaleSync } from "@/components/locale-sync";
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
        {/* `key={locale}` forces a clean re-mount of the provider subtree
            when the active locale changes (e.g. after the user saves a new
            preference in account settings) so every `useTranslations()`
            consumer picks up the new messages instead of holding the stale
            ones from the initial mount. */}
        <NextIntlClientProvider
          key={locale}
          locale={locale}
          messages={messages}
        >
          <LocaleSync currentLocale={locale} />
          <SuperTokensProvider>{children}</SuperTokensProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
