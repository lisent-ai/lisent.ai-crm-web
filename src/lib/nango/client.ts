"use client";

import Nango from "@nangohq/frontend";

// Phase 2.1: Nango self-hosted as OAuth gateway. The frontend SDK opens
// the popup, Nango does the Facebook OAuth dance + token storage, and
// returns a connectionId that the backend uses to fetch tokens via REST.
//
// Public key is build-baked at NEXT_PUBLIC_NANGO_PUBLIC_KEY — exposed to
// the browser bundle, but it's not a secret (Nango's design: public key
// authorizes Connect UI sessions only, can't read other tenants).
//
// Lazy singleton — Nango's client is stateless after construction, no
// reason to allocate per call. SSR/RSC contexts can't use it (the SDK
// touches window) so this file is "use client".

let _nangoInstance: Nango | null = null;

function getNangoConfig(): { host: string; publicKey: string } {
  const host = process.env.NEXT_PUBLIC_NANGO_HOST;
  const publicKey = process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY;
  if (!host || !publicKey) {
    throw new NangoNotConfiguredError(
      "Nango is not yet configured (NEXT_PUBLIC_NANGO_HOST or NEXT_PUBLIC_NANGO_PUBLIC_KEY missing).",
    );
  }
  return { host, publicKey };
}

export function getNango(): Nango {
  if (!_nangoInstance) {
    const { host, publicKey } = getNangoConfig();
    _nangoInstance = new Nango({ host, publicKey });
  }
  return _nangoInstance;
}

/**
 * Triggers Nango's OAuth Connect popup for the Facebook provider.
 * Returns the connectionId on success — the caller passes that to the
 * CRM backend so it can fetch tokens from Nango via REST.
 *
 * connectionId convention: we use the company UUID — one Nango
 * connection per workspace, replaceable on re-auth.
 *
 * Throws NangoNotConfiguredError when env is missing (pre-launch state)
 * so the modal can render a friendly hint instead of a blank failure.
 */
export async function connectMetaViaNango(
  companyId: string,
  providerConfigKey = "facebook",
): Promise<{ connectionId: string; providerConfigKey: string }> {
  const nango = getNango();
  // Nango.auth() opens the OAuth popup, returns when the user grants
  // (or rejects) access. On rejection it throws — caller surfaces.
  await nango.auth(providerConfigKey, companyId);
  return { connectionId: companyId, providerConfigKey };
}

export class NangoNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NangoNotConfiguredError";
  }
}

export function isNangoConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_NANGO_HOST && process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY,
  );
}
