// Shared HTML shell for every transactional email. Inline styles only
// (email clients strip <style>/external CSS), a single centered card,
// and dir-aware so Arabic renders right-to-left.

export interface BaseLayoutInput {
  dir: "ltr" | "rtl";
  brand: string;
  contentHtml: string;
  footer: string;
}

export function baseLayout(input: BaseLayoutInput): string {
  const { dir, brand, contentHtml, footer } = input;
  const align = dir === "rtl" ? "right" : "left";
  return `<!doctype html>
<html dir="${dir}" lang="">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:24px 32px 0 32px;text-align:${align};">
                <span style="font-size:18px;font-weight:700;color:#111827;">${brand}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;text-align:${align};color:#27272a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px 32px;text-align:${align};color:#a1a1aa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;border-top:1px solid #f4f4f5;">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Primary call-to-action button (table-based for Outlook).
export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:10px;background:#4f46e5;">
        <a href="${href}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">${label}</a>
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
