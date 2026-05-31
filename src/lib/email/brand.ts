// Public URL of the white wordmark used in email headers. Hosted from the
// app's /public (deployed: https://app.lisent.ai/email/logo-white.png).
// Empty → templates fall back to white "Lisent" text, so a missing/unset
// URL never shows a broken image.
export function brandLogoUrl(): string {
  return process.env.EMAIL_LOGO_URL?.trim() ?? "";
}
