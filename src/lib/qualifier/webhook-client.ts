/**
 * Client for qualifier v1 outbound webhook config (via BFF proxy).
 *
 * Backed by `/v1/config/webhook*` endpoints on the qualifier. The BFF at
 * `/api/qualifier-v1/config/webhook*?company=<uuid>` attaches the platform
 * token + source_ref.
 */

import { QualifierV1Error } from "./api-keys-client";

export type WebhookPayloadMode = "full" | "minimal";

export type WebhookConfig = {
  url: string | null;
  has_secret: boolean;
  secret_rotated_at: string | null;
  enabled_events: string[];
  payload_mode: WebhookPayloadMode;
  event_catalog: Record<string, string[]>;
  dlq_size: number;
  recent_dlq: Array<{
    event_id: string | null;
    event_type: string | null;
    attempt: number | null;
    delivery_id: string | null;
    dlq_reason: string | null;
    dlq_at_ms: number | null;
  }>;
};

export type WebhookPatchResult = {
  url: string | null;
  has_secret: boolean;
  secret: string | null;  // plaintext, returned ONCE
  secret_rotated_at: string | null;
  enabled_events: string[];
  payload_mode: WebhookPayloadMode;
};

export type WebhookPatchInput = {
  url?: string;
  rotate_secret?: boolean;
  enabled_events?: string[];
  payload_mode?: WebhookPayloadMode;
};

export type WebhookTestResult = {
  enqueued: boolean;
  tenant_id: string;
  event_id: string;
  url: string | null;
};

async function bffRequest<T>(
  companyId: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `/api/qualifier-v1${path}?company=${encodeURIComponent(companyId)}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (resp.status === 204) return undefined as unknown as T;

  const text = await resp.text();
  const body = text ? JSON.parse(text) : null;

  if (!resp.ok) {
    const msg = typeof body?.error === "string"
      ? body.error
      : typeof body?.detail === "string"
        ? body.detail
        : `HTTP ${resp.status}`;
    throw new QualifierV1Error(resp.status, msg);
  }

  return body as T;
}

export async function getWebhookConfig(companyId: string): Promise<WebhookConfig> {
  return bffRequest<WebhookConfig>(companyId, "/config/webhook");
}

export async function patchWebhookConfig(
  companyId: string,
  patch: WebhookPatchInput,
): Promise<WebhookPatchResult> {
  return bffRequest<WebhookPatchResult>(companyId, "/config/webhook", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export type WebhookTestInput = {
  score?: number;
  lead_id?: string;
  event_type?: string;
  external_id?: string;
  from_stage?: string;
  to_stage?: string;
};

export async function testWebhook(
  companyId: string,
  body?: WebhookTestInput,
): Promise<WebhookTestResult> {
  return bffRequest<WebhookTestResult>(companyId, "/config/webhook/test", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}
