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

export function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
