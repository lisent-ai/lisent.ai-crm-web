import crypto from "node:crypto";

// HMAC client for the email-gateway service. Mirrors the gateway's
// POST /send contract (see lisent.ai-email-gateway/src/contract.ts).
// `from` is intentionally NOT sent — the gateway owns the sender identity.

export interface GatewaySendInput {
  to: string;
  toName?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
  clientIp?: string;
  tags?: Record<string, string>;
}

function gatewayConfig(): { url: string; secret: string } {
  const url = process.env.EMAIL_GATEWAY_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.EMAIL_GATEWAY_HMAC_SECRET?.trim();
  if (!url || !secret) {
    throw new Error(
      "email gateway not configured (EMAIL_GATEWAY_URL / EMAIL_GATEWAY_HMAC_SECRET)",
    );
  }
  return { url, secret };
}

export async function sendViaGateway(
  input: GatewaySendInput,
): Promise<{ messageId: string }> {
  const { url, secret } = gatewayConfig();
  const body = JSON.stringify(input);
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const res = await fetch(`${url}/send`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    },
    body,
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    messageId?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !json.ok || !json.messageId) {
    throw new Error(
      `email gateway send failed: ${json.error ?? `HTTP ${res.status}`}${json.code ? ` (${json.code})` : ""}`,
    );
  }
  return { messageId: json.messageId };
}
