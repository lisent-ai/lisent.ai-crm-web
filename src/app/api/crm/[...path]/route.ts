import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

ensureBackendSuperTokensInit();

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function getCRMConfig() {
  const baseURL = process.env.CRM_BASE_URL?.trim() ?? "";
  const apiKey = process.env.CRM_INTERNAL_API_KEY?.trim() ?? "";

  if (baseURL === "") {
    throw new Error("CRM_BASE_URL must be configured");
  }
  if (apiKey === "") {
    throw new Error("CRM_INTERNAL_API_KEY must be configured");
  }

  return { baseURL: baseURL.replace(/\/+$/, ""), apiKey };
}

function buildUpstreamURL(baseURL: string, pathSegments: string[], search: string) {
  const encodedPath = pathSegments
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseURL}/${encodedPath}${search}`;
}

async function forwardRequest(
  request: NextRequest,
  context: RouteContext,
  userID: string,
) {
  let config: { baseURL: string; apiKey: string };
  try {
    config = getCRMConfig();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "invalid CRM configuration";
    return Response.json({ error: message }, { status: 500 });
  }

  const params = await context.params;
  const pathSegments = params.path ?? [];

  if (pathSegments.length === 0) {
    return Response.json({ error: "missing CRM path" }, { status: 400 });
  }

  const upstreamURL = buildUpstreamURL(
    config.baseURL,
    pathSegments,
    request.nextUrl.search,
  );

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (accept) {
    headers.set("accept", accept);
  }
  headers.set("x-api-key", config.apiKey);
  headers.set("x-user-id", userID);

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstreamResponse = await fetch(upstreamURL, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const responseContentType = upstreamResponse.headers.get("content-type");
  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

async function handle(request: NextRequest, context: RouteContext) {
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json(
        { error: error.message ?? "session validation failed" },
        { status: 500 },
      );
    }
    if (session === undefined) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    return forwardRequest(request, context, session.getUserId());
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}
