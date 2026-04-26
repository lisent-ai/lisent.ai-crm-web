export const locales = [
  "tr", "en", "de", "fr", "es", "it", "pt", "nl",
  "pl", "ru", "ar", "sv", "da", "no", "fi",
] as const;

export type SupportedLocale = (typeof locales)[number];

export const defaultLocale: SupportedLocale = "en";

export const localeLabels: Record<SupportedLocale, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski",
  ru: "Русский",
  ar: "العربية",
  sv: "Svenska",
  da: "Dansk",
  no: "Norsk",
  fi: "Suomi",
};

export const localeToBcp47: Record<SupportedLocale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  pl: "pl-PL",
  ru: "ru-RU",
  ar: "ar-SA",
  sv: "sv-SE",
  da: "da-DK",
  no: "nb-NO",
  fi: "fi-FI",
};

const rtlLocales: ReadonlySet<SupportedLocale> = new Set(["ar"]);

export function isRtl(locale: SupportedLocale): boolean {
  return rtlLocales.has(locale);
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function parseAcceptLanguage(header: string): SupportedLocale {
  const entries = header
    .split(",")
    .map((part) => {
      const [lang, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1;
      return {
        lang: lang.toLowerCase().split("-")[0],
        q: Number.isFinite(q) ? q : 1,
      };
    })
    .filter((entry) => entry.lang.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const entry of entries) {
    if (isSupportedLocale(entry.lang)) {
      return entry.lang;
    }
  }

  return defaultLocale;
}
