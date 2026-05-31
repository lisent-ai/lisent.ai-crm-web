import type { EmailI18n } from "../i18n";
import { baseLayout, escapeHtml } from "./base-layout";
import type { RenderedEmail } from "./password-reset";

export interface VerifyEmailOtpData {
  email: string;
  code: string;
}

// Email-verification OTP. Shows a large, monospace 6-digit code (no link)
// the user types back into the app after signup.
export function renderVerifyEmailOtp(
  i18n: EmailI18n,
  data: VerifyEmailOtpData,
): RenderedEmail {
  const { t, dir } = i18n;
  const code = escapeHtml(data.code);

  const codeBox = `
    <div style="margin:20px 0;text-align:center;">
      <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:14px 22px;">${code}</span>
    </div>`;

  const content = `
    <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">${escapeHtml(t("email.verifyEmail.heading"))}</h1>
    <p style="margin:0 0 4px 0;">${escapeHtml(t("email.verifyEmail.intro", { email: data.email }))}</p>
    ${codeBox}
    <p style="margin:8px 0 4px 0;color:#71717a;font-size:13px;">${escapeHtml(t("email.verifyEmail.expiry"))}</p>
    <p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(t("email.verifyEmail.ignore"))}</p>
  `;

  const html = baseLayout({
    dir,
    brand: t("email.brand"),
    contentHtml: content,
    footer: escapeHtml(t("email.footer")),
  });

  const text = [
    t("email.verifyEmail.heading"),
    "",
    t("email.verifyEmail.intro", { email: data.email }),
    "",
    data.code,
    "",
    t("email.verifyEmail.expiry"),
    t("email.verifyEmail.ignore"),
  ].join("\n");

  return { subject: t("email.verifyEmail.subject"), html, text };
}
