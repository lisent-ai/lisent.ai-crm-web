import { localeToBcp47, type SupportedLocale } from "./config";

const FALLBACK = "—";

export function formatDate(
  value: Date | string | number,
  locale: SupportedLocale,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return FALLBACK;
  return new Intl.DateTimeFormat(localeToBcp47[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(localeToBcp47[locale]).format(value);
}

export function formatCurrency(
  value: number,
  locale: SupportedLocale,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat(localeToBcp47[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatRelative(
  value: Date | string | number,
  locale: SupportedLocale,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return FALLBACK;

  const diffSeconds = (Date.now() - date.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(localeToBcp47[locale], {
    numeric: "auto",
  });

  if (diffSeconds < 60) return rtf.format(-Math.round(diffSeconds), "second");
  if (diffSeconds < 3600) return rtf.format(-Math.round(diffSeconds / 60), "minute");
  if (diffSeconds < 86400) return rtf.format(-Math.round(diffSeconds / 3600), "hour");
  if (diffSeconds < 2592000) return rtf.format(-Math.round(diffSeconds / 86400), "day");
  if (diffSeconds < 31536000) return rtf.format(-Math.round(diffSeconds / 2592000), "month");
  return rtf.format(-Math.round(diffSeconds / 31536000), "year");
}
