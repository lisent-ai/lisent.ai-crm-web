const defaultOrigin = "http://localhost:3010";

/** Paths + name (safe to embed at build time). */
export const appInfoBase = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Lisent CRM",
  apiBasePath: process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/auth",
  websiteBasePath: process.env.NEXT_PUBLIC_WEBSITE_BASE_PATH ?? "/auth",
};

/**
 * Build-time domains (may be wrong if Docker build args did not reach the builder).
 * On the server, prefer `resolveAppInfoForBackend(request)`; on the client, `window.location.origin`.
 */
export const appInfo = {
  ...appInfoBase,
  apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN ?? defaultOrigin,
  websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ?? defaultOrigin,
};

/** Public origin from reverse-proxy headers (Dokploy / Traefik / Cloudflare). */
export function derivePublicOriginFromRequest(request: Request): string | undefined {
  const rawHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!rawHost) return undefined;

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isLocal =
    rawHost.startsWith("localhost") ||
    rawHost.startsWith("127.") ||
    rawHost.includes(".local");
  const proto = forwardedProto || (isLocal ? "http" : "https");

  return `${proto}://${rawHost}`;
}

/**
 * SuperTokens Node `appInfo`: explicit env wins, then this request’s public URL, then build-time fallbacks.
 */
export function resolveAppInfoForBackend(request?: Request) {
  const envOrigin = process.env.APP_PUBLIC_ORIGIN?.trim();
  if (envOrigin) {
    return {
      ...appInfoBase,
      apiDomain: envOrigin,
      websiteDomain: envOrigin,
    };
  }
  if (request) {
    const fromReq = derivePublicOriginFromRequest(request);
    if (fromReq) {
      return {
        ...appInfoBase,
        apiDomain: fromReq,
        websiteDomain: fromReq,
      };
    }
  }
  return appInfo;
}

/** @deprecated Use `resolveAppInfoForBackend()` or pass a `Request` into backend init. */
export function getServerAppInfo() {
  return resolveAppInfoForBackend(undefined);
}
