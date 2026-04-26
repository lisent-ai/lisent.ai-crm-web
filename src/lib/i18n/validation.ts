import { isSupportedLocale } from "./config";

export type LocaleValidationError = { key: string };

export function validateLocale(
  value: unknown,
): LocaleValidationError | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  if (!isSupportedLocale(value)) {
    return { key: "validation.languageInvalid" };
  }
  return undefined;
}
