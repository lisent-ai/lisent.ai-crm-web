/**
 * Feature flag module.
 *
 * Flags are read from environment variables and resolved at module init. They
 * are boolean-only, default false, and intentionally do NOT dynamically refresh
 * at runtime — a deploy is the unit of change. Prefix convention:
 *
 *   NEXT_PUBLIC_*   — exposed to the browser (safe at build time)
 *
 * Server-only flags (no NEXT_PUBLIC_ prefix) may also be added here; they will
 * only resolve to true when accessed from server code.
 */

// IMPORTANT: use direct `process.env.NEXT_PUBLIC_*` literal access below.
// Next.js statically replaces those references at build time with the string
// value baked into the client bundle. Dynamic reads like `process.env[name]`
// are NOT inlined and will always be `undefined` on the client, silently
// disabling every flag regardless of the build arg.
function isTrue(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

export const featureFlags = {
  /** Enables the top-level Integrations sidebar entry and the /dashboard/integrations routes. */
  integrationsHub: isTrue(process.env.NEXT_PUBLIC_INTEGRATIONS_HUB_ENABLED),
  /** Enables the Intranet integration card + config UI inside the Integrations Hub. */
  intranetIntegration: isTrue(process.env.NEXT_PUBLIC_INTRANET_INTEGRATION_ENABLED),
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
