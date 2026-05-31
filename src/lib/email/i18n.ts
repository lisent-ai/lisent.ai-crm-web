import {
  defaultLocale,
  isSupportedLocale,
  type SupportedLocale,
} from "@/lib/i18n/config";

// Email-time i18n. Auth emails are rendered OUTSIDE the next-intl request
// scope (inside SuperTokens callbacks), so we load the message JSON
// directly — the same files the Groq translation pipeline maintains — and
// fall back to the default locale (en) for any key a locale hasn't been
// translated to yet.

type Messages = Record<string, unknown>;

async function loadMessages(locale: string): Promise<Messages> {
  try {
    return (await import(`../../../messages/${locale}.json`)).default as Messages;
  } catch {
    return (await import(`../../../messages/${defaultLocale}.json`))
      .default as Messages;
  }
}

function lookup(messages: Messages, dottedKey: string): string | undefined {
  let cursor: unknown = messages;
  for (const part of dottedKey.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

export interface EmailI18n {
  locale: SupportedLocale;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
}

// Resolve a translator for the recipient's language. `localeInput` is the
// user's saved language (UserMetadata.profile.language); unknown/missing
// falls back to the default locale.
export async function getEmailI18n(localeInput?: string): Promise<EmailI18n> {
  const locale: SupportedLocale = isSupportedLocale(localeInput)
    ? localeInput
    : defaultLocale;

  const primary = await loadMessages(locale);
  const fallback =
    locale === defaultLocale ? primary : await loadMessages(defaultLocale);

  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw = lookup(primary, key) ?? lookup(fallback, key) ?? key;
    return interpolate(raw, vars);
  };

  return { locale, dir: locale === "ar" ? "rtl" : "ltr", t };
}
