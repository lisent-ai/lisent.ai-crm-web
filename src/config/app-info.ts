const defaultOrigin = "http://localhost:3010";

/** Paths + name (safe to embed at build time). */
export const appInfoBase = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Lisent CRM",
  apiBasePath: process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/auth",
  websiteBasePath: process.env.NEXT_PUBLIC_WEBSITE_BASE_PATH ?? "/auth",
};

/**
 * Build-time domains (may be wrong if Docker build args did not reach the builder).
 * Prefer `getServerAppInfo()` on the server and `window.location.origin` on the client.
 */
export const appInfo = {
  ...appInfoBase,
  apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN ?? defaultOrigin,
  websiteDomain: process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ?? defaultOrigin,
};

/**
 * SuperTokens Node: use at init. Reads `APP_PUBLIC_ORIGIN` at runtime (Dokploy env),
 * so you are not stuck with a bad `NEXT_PUBLIC_*` bake from build.
 */
export function getServerAppInfo() {
  const origin = process.env.APP_PUBLIC_ORIGIN?.trim();
  if (origin) {
    return {
      ...appInfoBase,
      apiDomain: origin,
      websiteDomain: origin,
    };
  }
  return appInfo;
}
