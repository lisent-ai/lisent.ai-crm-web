/**
 * Client for the qualifier v1 API keys endpoints (via BFF proxy).
 *
 * All requests proxy through `/api/qualifier-v1/api-keys?company=<uuid>`.
 * Errors are thrown as `QualifierV1Error` with upstream status.
 */

export class QualifierV1Error extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "QualifierV1Error";
    this.status = status;
  }
}

export type APIKeyPublic = {
  id: string;
  tenant_id: string;
  prefix: string;
  last_4: string;
  name: string;
  scopes: string[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type APIKeyCreateResponse = APIKeyPublic & { raw_key: string };

export type APIKeyCreateInput = {
  name: string;
  scopes?: string[];
  environment?: "live" | "test";
  expires_at?: string | null;
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

export async function listAPIKeys(
  companyId: string,
  opts?: { includeRevoked?: boolean },
): Promise<APIKeyPublic[]> {
  const q = opts?.includeRevoked ? "&include_revoked=true" : "";
  return bffRequest<APIKeyPublic[]>(companyId, `/api-keys${q}`);
}

export async function createAPIKey(
  companyId: string,
  input: APIKeyCreateInput,
): Promise<APIKeyCreateResponse> {
  return bffRequest<APIKeyCreateResponse>(companyId, "/api-keys", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function revokeAPIKey(companyId: string, keyId: string): Promise<void> {
  await bffRequest<void>(companyId, `/api-keys/${encodeURIComponent(keyId)}`, {
    method: "DELETE",
  });
}
