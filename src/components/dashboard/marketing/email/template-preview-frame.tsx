"use client";

// TemplatePreviewFrame renders Mailchimp template HTML inside a sandboxed
// iframe. The sandbox attribute disables script execution + form
// submission, so even hostile / injected content can't escape the
// preview into the parent app.
//
// Mailchimp HTML often references external images and may pull web fonts.
// We allow same-origin for those resources via `allow-same-origin`;
// that's safe here because the HTML can't run scripts.
type TemplatePreviewFrameProps = {
  html: string;
  className?: string;
  title?: string;
};

export function TemplatePreviewFrame({
  html,
  className,
  title = "Email preview",
}: Readonly<TemplatePreviewFrameProps>) {
  // We use srcDoc rather than a Blob URL because srcDoc keeps the
  // sandboxed origin opaque (`null`) which matches the most restrictive
  // safety posture. Mailchimp merge tags like {{FNAME|there}} stay
  // visible in the preview — they only get substituted at send time.
  //
  // The key prop forces a fresh iframe instance every time the html
  // payload changes. Without it some browsers cache the srcDoc and
  // skip re-rendering on prop change — operators saw stale previews
  // after pasting fresh templates.
  const body = html || "<p style='color:#999;font-family:sans-serif;'>(empty)</p>";
  return (
    <iframe
      key={`${body.length}:${body.slice(0, 64)}`}
      // Sandbox notes:
      //   - allow-same-origin : lets the iframe load external images
      //     that need credentials or cookies (e.g. Mailchimp's own
      //     image CDN). We intentionally do NOT add allow-scripts so
      //     any <script> in the HTML stays inert.
      //   - allow-popups      : kept off; preview never needs to open
      //     a new window.
      sandbox="allow-same-origin"
      srcDoc={body}
      title={title}
      className={
        className ??
        "h-[480px] w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white"
      }
    />
  );
}
