export const appInfo = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Lisent CRM",
  apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN ?? "http://localhost:3010",
  websiteDomain:
    process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ?? "http://localhost:3010",
  apiBasePath: process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/auth",
  websiteBasePath: process.env.NEXT_PUBLIC_WEBSITE_BASE_PATH ?? "/auth",
};
