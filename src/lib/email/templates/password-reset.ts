import { brandLogoUrl } from "../brand";
import type { EmailI18n } from "../i18n";
import { baseLayout, ctaButton, escapeHtml, palette } from "./base-layout";

export interface PasswordResetData {
  email: string;
  link: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Password-reset email. Localized via the recipient's saved language
// (falls back to en). The link is a SuperTokens-issued reset URL.
export function renderPasswordReset(
  i18n: EmailI18n,
  data: PasswordResetData,
): RenderedEmail {
  const { t, dir } = i18n;
  const p = palette;
  const safeLink = escapeHtml(data.link);

  const content = `
    <h1 style="margin:0 0 12px 0;font-size:21px;font-weight:700;color:${p.heading};">${escapeHtml(t("email.passwordReset.heading"))}</h1>
    <p style="margin:0 0 4px 0;color:${p.body};">${escapeHtml(t("email.passwordReset.intro", { email: data.email }))}</p>
    ${ctaButton(escapeHtml(t("email.passwordReset.cta")), safeLink)}
    <p style="margin:8px 0 4px 0;color:${p.muted};font-size:13px;">${escapeHtml(t("email.passwordReset.fallback"))}</p>
    <p style="margin:0 0 12px 0;word-break:break-all;"><a href="${safeLink}" style="color:${p.link};font-size:13px;">${safeLink}</a></p>
    <p style="margin:0;color:${p.muted};font-size:13px;">${escapeHtml(t("email.passwordReset.ignore"))}</p>
  `;

  const html = baseLayout({
    dir,
    brand: t("email.brand"),
    logoUrl: brandLogoUrl(),
    contentHtml: content,
    footer: escapeHtml(t("email.footer")),
  });

  const text = [
    t("email.passwordReset.heading"),
    "",
    t("email.passwordReset.intro", { email: data.email }),
    "",
    `${t("email.passwordReset.cta")}: ${data.link}`,
    "",
    t("email.passwordReset.ignore"),
  ].join("\n");

  return { subject: t("email.passwordReset.subject"), html, text };
}
