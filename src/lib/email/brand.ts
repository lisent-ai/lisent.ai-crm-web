// Public URL of the white wordmark used in email headers. Hosted on the
// marketing site (https://lisent.ai/logos/logo_white_text.png) so it loads
// in real inboxes. Empty → templates fall back to white "Lisent" text, so a
// missing/unset URL never shows a broken image.
export function brandLogoUrl(): string {
  return process.env.EMAIL_LOGO_URL?.trim() ?? "";
}
