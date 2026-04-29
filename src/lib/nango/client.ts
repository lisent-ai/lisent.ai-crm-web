"use client";

import Nango from "@nangohq/frontend";

import {
  getMetaConnectSession,
  getSheetsConnectSession,
} from "@/lib/crm/client";

// Phase 2.1: Nango self-hosted as OAuth gateway. The frontend SDK opens
// the popup, Nango does the Facebook OAuth dance + token storage, and
// returns a connectionId that the backend uses to fetch tokens via REST.
//
// Nango v0.40+ retired the publicKey-based nango.auth() flow. The new
// flow: backend mints a short-lived Connect Session token (using the
// secret key), frontend constructs Nango with that token, then calls
// auth(). We always go through the backend — no env vars needed in the
// browser bundle anymore.

function getNangoHost(): string {
  return process.env.NEXT_PUBLIC_NANGO_HOST || "https://oauth.lisent.ai";
}

/**
 * Triggers Nango's OAuth Connect popup for the Facebook provider.
 * Returns the connectionId on success — the caller passes that to the
 * CRM backend so it can fetch tokens from Nango via REST.
 *
 * connectionId convention: we use the company UUID — one Nango
 * connection per workspace, replaceable on re-auth.
 *
 * Throws NangoNotConfiguredError when the backend reports Nango is
 * unwired (503 nango_not_configured) so the modal can render a friendly
 * hint instead of a blank failure.
 */
export async function connectMetaViaNango(
  companyId: string,
  providerConfigKey = "facebook",
): Promise<{ connectionId: string; providerConfigKey: string }> {
  const session = await getMetaConnectSession(companyId, providerConfigKey);
  const nango = new Nango({
    host: getNangoHost(),
    connectSessionToken: session.sessionToken,
  });
  // With a session token, connection_id is forbidden as a second arg —
  // Nango derives it from the session's end_user.id (which we set to
  // companyId backend-side). Passing it triggers invalid_query_params.
  await nango.auth(session.providerConfigKey);
  return {
    connectionId: session.connectionId,
    providerConfigKey: session.providerConfigKey,
  };
}

/**
 * Triggers Nango's OAuth Connect popup for the Google Sheets provider.
 *
 * Important: Nango v0.40+ session-token flow assigns its OWN random UUID
 * as the connection_id — the `end_user.id` we set backend-side ends up on
 * Nango's `end_user` record, not on `connection_id`. We must therefore
 * use the connectionId surfaced by `nango.auth()` (not the optimistic
 * pre-popup value the backend echoed back). Otherwise the post-popup
 * GetConnection call hits a 404.
 */
export async function connectGoogleSheetsViaNango(
  companyId: string,
  providerConfigKey = "google-sheet",
): Promise<{ connectionId: string; providerConfigKey: string }> {
  const session = await getSheetsConnectSession(companyId, providerConfigKey);
  const nango = new Nango({
    host: getNangoHost(),
    connectSessionToken: session.sessionToken,
  });
  const result = (await nango.auth(session.providerConfigKey)) as
    | { connectionId?: string; providerConfigKey?: string }
    | undefined;
  return {
    connectionId: result?.connectionId ?? session.connectionId,
    providerConfigKey: result?.providerConfigKey ?? session.providerConfigKey,
  };
}

export class NangoNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NangoNotConfiguredError";
  }
}

/** Configuration check is now a backend concern (it knows the secret
 *  key). Kept as a stub returning true so the existing modal call site
 *  doesn't have to change shape — the actual readiness is enforced by
 *  the backend, which returns 503 nango_not_configured if env is empty,
 *  surfaced as MetaOAuthNotConfiguredError. */
export function isNangoConfigured(): boolean {
  return true;
}
