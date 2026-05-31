import { brandLogoUrl } from "../brand";
import type { EmailI18n } from "../i18n";
import { baseLayout, escapeHtml, palette } from "./base-layout";
import type { RenderedEmail } from "./password-reset";

export interface OtpCodeEmailData {
  email: string;
  code: string;
  // i18n key prefix: "email.verifyEmail" | "email.signinOtp".
  // Each provides .subject/.heading/.intro/.expiry/.ignore.
  prefix: string;
}

// Generic "here is your 6-digit code" email. Shared by signup
// verification and OTP sign-in — only the strings differ (via `prefix`).
export function renderOtpCodeEmail(
  i18n: EmailI18n,
  data: OtpCodeEmailData,
): RenderedEmail {
  const { t, dir } = i18n;
  const p = palette;
  const prefix = data.prefix;
  const code = escapeHtml(data.code);

  const codeBox = `
    <div style="margin:22px 0;text-align:center;">
      <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:${p.codeText};background:${p.codeBg};border:1px solid ${p.codeBorder};border-radius:14px;padding:16px 24px;">${code}</span>
    </div>`;

  const content = `
    <h1 style="margin:0 0 12px 0;font-size:21px;font-weight:700;color:${p.heading};">${escapeHtml(t(`${prefix}.heading`))}</h1>
    <p style="margin:0 0 4px 0;color:${p.body};">${escapeHtml(t(`${prefix}.intro`, { email: data.email }))}</p>
    ${codeBox}
    <p style="margin:8px 0 4px 0;color:${p.muted};font-size:13px;">${escapeHtml(t(`${prefix}.expiry`))}</p>
    <p style="margin:0;color:${p.muted};font-size:13px;">${escapeHtml(t(`${prefix}.ignore`))}</p>
  `;

  const html = baseLayout({
    dir,
    brand: t("email.brand"),
    logoUrl: brandLogoUrl(),
    contentHtml: content,
    footer: escapeHtml(t("email.footer")),
  });

  const text = [
    t(`${prefix}.heading`),
    "",
    t(`${prefix}.intro`, { email: data.email }),
    "",
    data.code,
    "",
    t(`${prefix}.expiry`),
    t(`${prefix}.ignore`),
  ].join("\n");

  return { subject: t(`${prefix}.subject`), html, text };
}
