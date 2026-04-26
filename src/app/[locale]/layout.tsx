import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { isSupportedLocale, locales } from "@/lib/i18n/config";

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return {};
  }
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map((loc) => [loc, `/${loc}`])),
        "x-default": `/${locales[0]}`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  return <>{children}</>;
}
