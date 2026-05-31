import type { EmailI18n } from "../i18n";
import { baseLayout, escapeHtml } from "./base-layout";
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
  const p = data.prefix;
  const code = escapeHtml(data.code);

  const codeBox = `
    <div style="margin:20px 0;text-align:center;">
      <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:14px 22px;">${code}</span>
    </div>`;

  const content = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">${escapeHtml(t(`${p}.heading`))}</h1>
    <p style="margin:0 0 4px 0;">${escapeHtml(t(`${p}.intro`, { email: data.email }))}</p>
    ${codeBox}
    <p style="margin:8px 0 4px 0;color:#71717a;font-size:13px;">${escapeHtml(t(`${p}.expiry`))}</p>
    <p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(t(`${p}.ignore`))}</p>
  `;

  const html = baseLayout({
    dir,
    brand: t("email.brand"),
    contentHtml: content,
    footer: escapeHtml(t("email.footer")),
  });

  const text = [
    t(`${p}.heading`),
    "",
    t(`${p}.intro`, { email: data.email }),
    "",
    data.code,
    "",
    t(`${p}.expiry`),
    t(`${p}.ignore`),
  ].join("\n");

  return { subject: t(`${p}.subject`), html, text };
}
