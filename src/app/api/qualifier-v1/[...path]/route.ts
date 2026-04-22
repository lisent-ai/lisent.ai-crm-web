/**
 * BFF proxy for Lisent qualifier v1 public API.
 *
 * Legacy proxy lives at `/api/qualifier/[...path]` — that one targets the
 * `/internal/*` endpoints with a static x-api-key and is kept untouched.
 *
 * This proxy forwards to the new `/v1/*` public API. Auth model:
 *   - Outgoing Authorization: Bearer {QUALIFIER_PLATFORM_TOKEN} — server-side
 *   - Outgoing X-Lisent-Source-Ref: {companyId} — from `?company=<uuid>` query
 *   - Qualifier resolves the tenant from source_ref (legacy CRM company ↔ tenant
 *     mapping established by migration 003).
 *
 * The current user's session company permission is validated before forwarding
 * via the same `access-control` helper used elsewhere.
 *
 * Supported: GET, POST, PATCH, DELETE.
 */

import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import { hasCompanyPermissionInAccess } from "@/lib/auth/access-control";
import { loadAccountProfile } from "@/lib/auth/account-server";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

function getConfig() {
  const baseURL = (process.env.QUALIFIER_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const platformToken = (process.env.QUALIFIER_PLATFORM_TOKEN ?? "").trim();
  if (!baseURL) throw new Error("QUALIFIER_BASE_URL must be configured");
  if (!platformToken) {
    throw new Error(
      "QUALIFIER_PLATFORM_TOKEN must be configured (matches qualifier's PLATFORM_ADMIN_TOKEN env)",
    );
  }
  return { baseURL, platformToken };
}

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

    const account = await loadAccountProfile(session.getUserId());
    if (!account) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    // ── Company context: ?company=<uuid> (same convention as other panels) ─
    const companyId = request.nextUrl.searchParams.get("company");
    if (!companyId) {
      return Response.json(
        { error: "company query param required (e.g. ?company=<uuid>)" },
        { status: 400 },
      );
    }

    // Permission check — `qualifier.manage` is the specific admin scope
    // defined in lib/auth/roles.ts (owner + admin have it by default).
    if (!hasCompanyPermissionInAccess(account.access, companyId, "qualifier.manage")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    let config: { baseURL: string; platformToken: string };
    try {
      config = getConfig();
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }

    // Forward path: `/api/qualifier-v1/{rest}` → `{baseURL}/v1/{rest}`
    const params = await context.params;
    const pathSegments = params.path ?? [];
    const encodedPath = pathSegments.map(encodeURIComponent).join("/");

    // Preserve query string — but strip our control param `company`
    const search = new URLSearchParams(request.nextUrl.searchParams);
    search.delete("company");
    const queryString = search.toString();
    const upstreamURL =
      `${config.baseURL}/v1/${encodedPath}` + (queryString ? `?${queryString}` : "");

    const method = request.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const headers = new Headers();
    headers.set("authorization", `Bearer ${config.platformToken}`);
    headers.set("x-lisent-source-ref", companyId);
    headers.set("x-lisent-source-type", "lisent_crm");
    const ct = request.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const userId = session.getUserId();
    if (userId) headers.set("x-lisent-actor-id", userId);
    // SSE resume: browsers auto-attach Last-Event-ID on EventSource reconnect.
    // Forward it so the qualifier can replay events since that id.
    const lastEventId = request.headers.get("last-event-id");
    if (lastEventId) headers.set("last-event-id", lastEventId);
    const accept = request.headers.get("accept");
    if (accept) headers.set("accept", accept);

    let upstream: Response;
    try {
      upstream = await fetch(upstreamURL, {
        method,
        headers,
        body,
        cache: "no-store",
      });
    } catch (err) {
      console.error("[qualifier-v1-proxy] fetch failed", {
        upstreamURL,
        err: (err as Error).message,
      });
      return Response.json(
        {
          error: "qualifier unreachable",
          detail: (err as Error).message,
          upstreamURL,
        },
        { status: 502 },
      );
    }

    // Transparent pass-through of status + body.
    // For SSE (`text/event-stream`), keep upstream's no-buffer hints so
    // intermediaries (Cloudflare, nginx, service workers) don't coalesce
    // frames into bigger chunks and break the stream.
    const resHeaders = new Headers();
    const resct = upstream.headers.get("content-type");
    if (resct) resHeaders.set("content-type", resct);
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) resHeaders.set("retry-after", retryAfter);
    const isSSE = (resct ?? "").toLowerCase().startsWith("text/event-stream");
    if (isSSE) {
      resHeaders.set("cache-control", "no-cache, no-transform");
      resHeaders.set("x-accel-buffering", "no");
      resHeaders.set("connection", "keep-alive");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handle(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handle(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handle(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handle(request, context);
}
