export function deriveCountryCode(country?: string) {
  const normalized = country?.trim().toLowerCase();

  switch (normalized) {
    case "germany":
      return "DE";
    case "turkey":
      return "TR";
    default:
      return country?.slice(0, 2).toUpperCase() || "--";
  }
}

const regionDisplayNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
    ? new Intl.DisplayNames(undefined, { type: "region" })
    : null;

function lookupCountryName(countryCode: string) {
  if (!regionDisplayNames) {
    return countryCode;
  }

  try {
    return regionDisplayNames.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function describeCustomerCountry(
  countryCode?: string,
  extraData?: Record<string, string>,
  fallbackCountry?: string,
) {
  const explicitCountry =
    extraData?.country?.trim() || extraData?.country_name?.trim();
  if (explicitCountry) {
    return explicitCountry;
  }

  const normalizedCode = countryCode?.trim().toUpperCase();
  if (normalizedCode && normalizedCode !== "--") {
    return lookupCountryName(normalizedCode);
  }

  return fallbackCountry?.trim() || "Not set";
}

export function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
