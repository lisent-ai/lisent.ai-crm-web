import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

function getQualifierConfig() {
  const baseURL = (process.env.QUALIFIER_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.QUALIFIER_INTERNAL_API_KEY ?? "").trim();
  if (!baseURL) throw new Error("QUALIFIER_BASE_URL must be configured");
  return { baseURL, apiKey };
}

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

    let config: { baseURL: string; apiKey: string };
    try {
      config = getQualifierConfig();
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }

    const params = await context.params;
    const pathSegments = params.path ?? [];
    const encodedPath = pathSegments.map(encodeURIComponent).join("/");
    const upstreamURL = `${config.baseURL}/internal/${encodedPath}${request.nextUrl.search}`;

    const method = request.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const headers = new Headers();
    if (config.apiKey) headers.set("x-api-key", config.apiKey);
    const ct = request.headers.get("content-type");
    if (ct) headers.set("content-type", ct);

    const upstream = await fetch(upstreamURL, { method, headers, body, cache: "no-store" });
    const resHeaders = new Headers();
    const resct = upstream.headers.get("content-type");
    if (resct) resHeaders.set("content-type", resct);
    return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context);
}
