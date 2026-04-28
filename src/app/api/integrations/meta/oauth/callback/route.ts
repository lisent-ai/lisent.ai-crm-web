import { NextResponse } from "next/server";

/**
 * Facebook OAuth callback. Facebook redirects the browser here after the
 * operator authorizes our App on facebook.com.
 *
 * We do NOT touch the CRM here — that's the connect modal's job, via the
 * regular session-bound BFF route (/api/crm/companies/:id/meta-oauth-callback).
 * Instead we just close the popup and hand the {code, state} back to the
 * opener via BroadcastChannel + window.opener.postMessage.
 *
 * The opener (meta-connect-modal.tsx) listens for the message, then makes
 * the authenticated CRM call itself. That keeps the OAuth code path
 * symmetric with the rest of the dashboard's session-based BFF model and
 * avoids the awkwardness of trying to associate an unauthenticated FB
 * redirect with the operator's CRM session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Embed the payload as a tiny inline-script HTML response. The popup
  // posts the message, then closes. CSP-safe fallback: if the opener is
  // already gone (user closed the parent window) we just render a "you
  // can close this" message.
  const payload = JSON.stringify({
    type: "meta-oauth-callback",
    code: code ?? "",
    state: state ?? "",
    error: error ?? "",
    errorDescription: errorDescription ?? "",
  });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Meta OAuth — Lisent</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; padding: 2rem; color: #4b5563; }
    .ok { color: #166534; }
    .err { color: #b91c1c; }
  </style>
</head>
<body>
  <p id="msg">Finishing Meta authorization...</p>
  <script>
    (function () {
      var payload = ${payload};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
        }
        var bc = ("BroadcastChannel" in window) ? new BroadcastChannel("meta-oauth") : null;
        if (bc) { bc.postMessage(payload); bc.close(); }
      } catch (e) { /* swallow */ }
      var msg = document.getElementById("msg");
      if (payload.error) {
        msg.className = "err";
        msg.textContent = "Meta authorization failed: " + (payload.errorDescription || payload.error);
      } else {
        msg.className = "ok";
        msg.textContent = "Authorized. Closing...";
        setTimeout(function () { window.close(); }, 600);
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
