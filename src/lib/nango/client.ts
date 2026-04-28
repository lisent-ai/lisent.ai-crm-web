"use client";

import Nango from "@nangohq/frontend";

import { getMetaConnectSession } from "@/lib/crm/client";

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
  await nango.auth(session.providerConfigKey, session.connectionId);
  return {
    connectionId: session.connectionId,
    providerConfigKey: session.providerConfigKey,
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
