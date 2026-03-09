import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import {
  addCompanyMembership,
  canAccessCompany,
  getAllowedCompanyIds,
  removeCompanyMembership,
} from "@/lib/auth/company-memberships";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

ensureBackendSuperTokensInit();

type CRMListResponse<T> = {
  data: T[];
  limit: number;
  offset: number;
};

type CRMCompanyRecord = {
  id: string;
  name: string;
};

type CRMCustomerRecord = {
  id: string;
  company_id?: string | null;
};

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

function parsePagination(searchParams: URLSearchParams) {
  const limit = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 100,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
  };
}

function buildForwardHeaders(
  request: NextRequest,
  apiKey: string,
  userID: string,
): Headers {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (accept) {
    headers.set("accept", accept);
  }
  headers.set("x-api-key", apiKey);
  headers.set("x-user-id", userID);
  return headers;
}

async function fetchCRMJSON<T>(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  userID: string,
  pathSegments: string[],
  search = "",
): Promise<T> {
  const upstreamURL = buildUpstreamURL(config.baseURL, pathSegments, search);
  const response = await fetch(upstreamURL, {
    method: "GET",
    headers: buildForwardHeaders(request, config.apiKey, userID),
    cache: "no-store",
  });

  if (!response.ok) {
    throw response;
  }

  return (await response.json()) as T;
}

async function relayUpstreamResponse(upstreamResponse: Response) {
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

async function sendUpstreamRequest(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  userID: string,
  pathSegments: string[],
) {
  const upstreamURL = buildUpstreamURL(
    config.baseURL,
    pathSegments,
    request.nextUrl.search,
  );
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  return fetch(upstreamURL, {
    method,
    headers: buildForwardHeaders(request, config.apiKey, userID),
    body,
    cache: "no-store",
  });
}

async function listAuthorizedCompanies(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  userID: string,
) {
  const allowedCompanyIds = new Set(await getAllowedCompanyIds(userID));
  const { limit, offset } = parsePagination(request.nextUrl.searchParams);

  if (allowedCompanyIds.size === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const payload = await fetchCRMJSON<CRMListResponse<CRMCompanyRecord>>(
    request,
    config,
    userID,
    ["companies"],
    "?limit=100&offset=0",
  );
  const filtered = payload.data.filter((company) => allowedCompanyIds.has(company.id));

  return Response.json({
    data: filtered.slice(offset, offset + limit),
    limit,
    offset,
  });
}

async function listAuthorizedCustomers(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  userID: string,
) {
  const searchParams = request.nextUrl.searchParams;
  const requestedCompanyId = searchParams.get("company_id")?.trim();
  if (requestedCompanyId) {
    const allowed = await canAccessCompany(userID, requestedCompanyId);
    if (!allowed) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const upstreamResponse = await sendUpstreamRequest(request, config, userID, ["customers"]);
    return relayUpstreamResponse(upstreamResponse);
  }

  const allowedCompanyIds = await getAllowedCompanyIds(userID);
  const { limit, offset } = parsePagination(searchParams);
  if (allowedCompanyIds.length === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const allCustomers: CRMCustomerRecord[] = [];
  for (const companyId of allowedCompanyIds) {
    const payload = await fetchCRMJSON<CRMListResponse<CRMCustomerRecord>>(
      request,
      config,
      userID,
      ["customers"],
      `?limit=100&offset=0&company_id=${encodeURIComponent(companyId)}`,
    );
    allCustomers.push(...payload.data);
  }

  return Response.json({
    data: allCustomers.slice(offset, offset + limit),
    limit,
    offset,
  });
}

async function readJSONBody(request: NextRequest) {
  try {
    return (await request.clone().json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function authorizeCustomerById(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  userID: string,
  customerId: string,
) {
  try {
    const customer = await fetchCRMJSON<CRMCustomerRecord>(
      request,
      config,
      userID,
      ["customers", customerId],
    );
    if (!customer.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const allowed = await canAccessCompany(userID, customer.company_id);
    if (!allowed) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return relayUpstreamResponse(error);
    }
    return Response.json({ error: "Failed to authorize customer." }, { status: 500 });
  }

  return null;
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

  const method = request.method.toUpperCase();
  const [resource, resourceId] = pathSegments;

  if (resource === "companies") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedCompanies(request, config, userID);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const upstreamResponse = await sendUpstreamRequest(request, config, userID, pathSegments);
      if (!upstreamResponse.ok) {
        return relayUpstreamResponse(upstreamResponse);
      }

      const payload = (await upstreamResponse.json()) as CRMCompanyRecord;
      await addCompanyMembership(userID, { companyId: payload.id, role: "owner" });
      return Response.json(payload, { status: upstreamResponse.status });
    }

    if (resourceId) {
      const allowed = await canAccessCompany(userID, resourceId);
      if (!allowed) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(request, config, userID, pathSegments);
      if (method === "DELETE" && upstreamResponse.ok) {
        await removeCompanyMembership(userID, resourceId);
      }
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "customers") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedCustomers(request, config, userID);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const body = await readJSONBody(request);
      const companyId =
        typeof body?.company_id === "string" ? body.company_id.trim() : "";
      if (!companyId) {
        return Response.json({ error: "company_id is required" }, { status: 400 });
      }

      const allowed = await canAccessCompany(userID, companyId);
      if (!allowed) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(request, config, userID, pathSegments);
      return relayUpstreamResponse(upstreamResponse);
    }

    if (resourceId) {
      const authFailure = await authorizeCustomerById(
        request,
        config,
        userID,
        resourceId,
      );
      if (authFailure) {
        return authFailure;
      }

      if (method === "PATCH" || method === "PUT") {
        const body = await readJSONBody(request);
        const companyId =
          typeof body?.company_id === "string" ? body.company_id.trim() : "";
        if (companyId) {
          const allowed = await canAccessCompany(userID, companyId);
          if (!allowed) {
            return Response.json({ error: "forbidden" }, { status: 403 });
          }
        }
      }

      const upstreamResponse = await sendUpstreamRequest(request, config, userID, pathSegments);
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "companies" && resourceId) {
    const allowed = await canAccessCompany(userID, resourceId);
    if (!allowed) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  if (resource === "customers" && resourceId) {
    const authFailure = await authorizeCustomerById(request, config, userID, resourceId);
    if (authFailure) {
      return authFailure;
    }
  }

  const upstreamResponse = await sendUpstreamRequest(request, config, userID, pathSegments);
  return relayUpstreamResponse(upstreamResponse);
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
