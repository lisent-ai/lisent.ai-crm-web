// Shared HTML shell for every transactional email — a dark, on-brand
// design matching lisent.ai (dark navy surfaces, white wordmark, violet
// accent). Table-based + inline styles only (email clients strip
// <style>/external CSS and don't do fl/grid). dir-aware for Arabic.

// Brand palette (kept here so every template pulls the same values).
export const palette = {
  pageBg: "#0a0e1a",
  cardBg: "#111729",
  cardBorder: "#1f2740",
  headerFrom: "#4c1d95",
  headerMid: "#6d28d9",
  headerTo: "#7c3aed",
  heading: "#f3f4f6",
  body: "#cbd5e1",
  muted: "#94a3b8",
  faint: "#6b7280",
  link: "#a78bfa",
  accent: "#7c3aed",
  codeBg: "#1a2138",
  codeBorder: "#4f46e5",
  codeText: "#ffffff",
} as const;

export interface BaseLayoutInput {
  dir: "ltr" | "rtl";
  brand: string;
  contentHtml: string;
  footer: string;
  logoUrl?: string;
}

export function baseLayout(input: BaseLayoutInput): string {
  const { dir, brand, contentHtml, footer, logoUrl } = input;
  const align = dir === "rtl" ? "right" : "left";
  const p = palette;

  const header = logoUrl
    ? `<img src="${logoUrl}" alt="${brand}" width="148" style="display:block;width:148px;max-width:148px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-size:22px;font-weight:700;letter-spacing:0.3px;color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${brand}</span>`;

  return `<!doctype html>
<html dir="${dir}" lang="">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
  </head>
  <body style="margin:0;padding:0;background-color:${p.pageBg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${p.pageBg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background-color:${p.cardBg};border:1px solid ${p.cardBorder};border-radius:20px;overflow:hidden;">
            <tr>
              <td align="center" style="background:${p.headerTo};background:linear-gradient(135deg, ${p.headerFrom} 0%, ${p.headerMid} 55%, ${p.headerTo} 100%);padding:30px 32px;">
                ${header}
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:${align};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${p.body};">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 26px;border-top:1px solid ${p.cardBorder};text-align:${align};">
                <p style="margin:0;color:${p.faint};font-size:12px;line-height:1.6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${footer}</p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
            <tr>
              <td align="center" style="padding:16px 8px 0;color:#3f4660;font-size:11px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                © ${brand}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Primary call-to-action button (table-based, bulletproof for Outlook).
export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
    <tr>
      <td style="border-radius:12px;background:${palette.accent};background:linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);">
        <a href="${href}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

// Escape user-controlled values before inlining into HTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
