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
  /** Enables the top-level "Marketing" nav module + /dashboard/marketing/* routes. */
  marketingModule: isTrue(process.env.NEXT_PUBLIC_MARKETING_MODULE_ENABLED),
  /** Enables the Meta Lead Ads integration card + config UI inside the Integrations Hub. */
  metaIntegration: isTrue(process.env.NEXT_PUBLIC_META_INTEGRATION_ENABLED),
  /** Phase 2: enables "Connect with Facebook" OAuth flow. When false the
   *  modal shows the legacy mock-only credentials form instead.
   *  Phase 2.1: this flag now ALSO gates the Nango-powered Connect path. */
  metaOAuth: isTrue(process.env.NEXT_PUBLIC_META_OAUTH_ENABLED),
  /** G1: enables the Google Sheets integration card + wizard inside the
   *  Integrations Hub. Manual "Sync now" only at G1; G2 will add cron. */
  googleSheetsIntegration: isTrue(process.env.NEXT_PUBLIC_GOOGLE_SHEETS_INTEGRATION_ENABLED),
  /** Mailchimp (per-USER): enables the catalog card + the Marketing
   *  → Email tab swap-out. The connect flow only works once the backend
   *  has NANGO_SECRET_KEY + the Mailchimp provider configured in Nango. */
  mailchimpIntegration: isTrue(process.env.NEXT_PUBLIC_MAILCHIMP_INTEGRATION_ENABLED),
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
