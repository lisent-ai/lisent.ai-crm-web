import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import {
  addCompanyMembership,
  removeCompanyFromAllMembers,
} from "@/lib/auth/company-memberships";
import {
  canAccessCompanyInAccess,
  hasCompanyPermissionInAccess,
} from "@/lib/auth/access-control";
import { loadAccountProfile } from "@/lib/auth/account-server";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

type CRMListResponse<T> = {
  data: T[];
  limit: number;
  offset: number;
};

type CRMCompanyRecord = {
  id: string;
  name: string;
  created_by_user_id?: string;
  created_by_user_name?: string;
};

type CRMCustomerRecord = {
  id: string;
  company_id?: string | null;
};

type CRMLeadRecord = {
  id: string;
  company_id?: string | null;
};

type CRMDealRecord = {
  id: string;
  company_id?: string | null;
};

type CRMTaskRecord = {
  id: string;
  company_id?: string | null;
  assignee_user_id?: string | null;
  created_by_user_id?: string | null;
  assignment_scope?: string | null;
  broadcast_group_id?: string | null;
};

type CRMCalendarEventRecord = {
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

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_MAX_LEN = 128;

function isPlausibleRequestID(value: string): boolean {
  if (!value || value.length > REQUEST_ID_MAX_LEN) {
    return false;
  }
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return false;
    }
  }
  return true;
}

function resolveRequestID(request: NextRequest): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER) ?? "";
  if (isPlausibleRequestID(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}

/**
 * Rewrites /companies/:id/qualifier-config and /companies/:id/qualifier-tokens/*
 * into the /internal/company/:id/* shape the CRM service actually registers.
 * Keeps the BFF's public URL surface uniform (everything under /companies/:id/)
 * while not having to add duplicate routes on the backend.
 */
function rewriteQualifierPath(pathSegments: string[]): string[] {
  const [, resourceId, kind, ...rest] = pathSegments;
  if (!resourceId || !kind) return pathSegments;
  if (kind === "qualifier-config") {
    return ["internal", "company", resourceId, "qualifier-config", ...rest];
  }
  if (kind === "qualifier-tokens") {
    return ["internal", "company", resourceId, "qualifier-token", ...rest];
  }
  if (kind === "qualifier-rag-config") {
    return ["internal", "company", resourceId, "rag-config", ...rest];
  }
  if (kind === "qualifier-rag-tokens") {
    return ["internal", "company", resourceId, "rag-token", ...rest];
  }
  if (kind === "qualifier-connect") {
    return ["internal", "company", resourceId, "qualifier", "connect"];
  }
  if (kind === "qualifier-disconnect") {
    return ["internal", "company", resourceId, "qualifier", "disconnect"];
  }
  return pathSegments;
}

function buildForwardHeaders(
  request: NextRequest,
  apiKey: string,
  userID: string,
  userName: string | undefined,
  requestID: string,
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
  if (userName?.trim()) {
    headers.set("x-user-name", userName.trim());
  }
  headers.set(REQUEST_ID_HEADER, requestID);
  return headers;
}

async function fetchCRMJSON<T>(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
  pathSegments: string[],
  search = "",
): Promise<T> {
  const upstreamURL = buildUpstreamURL(config.baseURL, pathSegments, search);
  const response = await fetch(upstreamURL, {
    method: "GET",
    headers: buildForwardHeaders(
      request,
      config.apiKey,
      account.userId,
      account.displayName,
      resolveRequestID(request),
    ),
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
  const upstreamRequestID = upstreamResponse.headers.get(REQUEST_ID_HEADER);
  if (upstreamRequestID) {
    responseHeaders.set(REQUEST_ID_HEADER, upstreamRequestID);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

async function sendUpstreamRequest(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
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
    headers: buildForwardHeaders(
      request,
      config.apiKey,
      account.userId,
      account.displayName,
      resolveRequestID(request),
    ),
    body,
    cache: "no-store",
  });
}

async function listAuthorizedCompanies(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
) {
  if (account.access.isSuperAdmin) {
    const upstreamResponse = await sendUpstreamRequest(
      request,
      config,
      account,
      ["companies"],
    );
    return relayUpstreamResponse(upstreamResponse);
  }

  const allowedCompanyIds = new Set(
    account.access.companyMemberships.map((membership) => membership.companyId),
  );
  const { limit, offset } = parsePagination(request.nextUrl.searchParams);

  if (allowedCompanyIds.size === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const payload = await fetchCRMJSON<CRMListResponse<CRMCompanyRecord>>(
    request,
    config,
    account,
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
  account: AccountProfile,
) {
  if (account.access.isSuperAdmin) {
    const upstreamResponse = await sendUpstreamRequest(
      request,
      config,
      account,
      ["customers"],
    );
    return relayUpstreamResponse(upstreamResponse);
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedCompanyId = searchParams.get("company_id")?.trim();
  if (requestedCompanyId) {
    if (
      !hasCompanyPermissionInAccess(
        account.access,
        requestedCompanyId,
        "customers.read",
      )
    ) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const upstreamResponse = await sendUpstreamRequest(
      request,
      config,
      account,
      ["customers"],
    );
    return relayUpstreamResponse(upstreamResponse);
  }

  const allowedCompanyIds = account.access.companyMemberships
    .filter((membership) =>
      hasCompanyPermissionInAccess(
        account.access,
        membership.companyId,
        "customers.read",
      ),
    )
    .map((membership) => membership.companyId);
  const { limit, offset } = parsePagination(searchParams);
  if (allowedCompanyIds.length === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const allCustomers: CRMCustomerRecord[] = [];
  for (const companyId of allowedCompanyIds) {
    const payload = await fetchCRMJSON<CRMListResponse<CRMCustomerRecord>>(
      request,
      config,
      account,
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
  account: AccountProfile,
  customerId: string,
  permission: "customers.read" | "customers.write",
) {
  if (account.access.isSuperAdmin) {
    return null;
  }

  try {
    const customer = await fetchCRMJSON<CRMCustomerRecord>(
      request,
      config,
      account,
      ["customers", customerId],
    );
    if (!customer.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!hasCompanyPermissionInAccess(account.access, customer.company_id, permission)) {
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

async function authorizeLeadById(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
  leadId: string,
  permission: "customers.read" | "customers.write",
) {
  if (account.access.isSuperAdmin) {
    return null;
  }

  try {
    const lead = await fetchCRMJSON<CRMLeadRecord>(
      request,
      config,
      account,
      ["leads", leadId],
    );
    if (!lead.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!hasCompanyPermissionInAccess(account.access, lead.company_id, permission)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return relayUpstreamResponse(error);
    }
    return Response.json({ error: "Failed to authorize lead." }, { status: 500 });
  }

  return null;
}

async function authorizeDealById(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
  dealId: string,
  permission: "customers.read" | "customers.write",
) {
  if (account.access.isSuperAdmin) {
    return null;
  }

  try {
    const deal = await fetchCRMJSON<CRMDealRecord>(
      request,
      config,
      account,
      ["deals", dealId],
    );
    if (!deal.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!hasCompanyPermissionInAccess(account.access, deal.company_id, permission)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return relayUpstreamResponse(error);
    }
    return Response.json({ error: "Failed to authorize deal." }, { status: 500 });
  }

  return null;
}

async function listAuthorizedLeads(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
) {
  if (account.access.isSuperAdmin) {
    const upstreamResponse = await sendUpstreamRequest(request, config, account, ["leads"]);
    return relayUpstreamResponse(upstreamResponse);
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedCompanyId = searchParams.get("company_id")?.trim();
  if (requestedCompanyId) {
    if (
      !hasCompanyPermissionInAccess(
        account.access,
        requestedCompanyId,
        "customers.read",
      )
    ) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const upstreamResponse = await sendUpstreamRequest(request, config, account, ["leads"]);
    return relayUpstreamResponse(upstreamResponse);
  }

  const allowedCompanyIds = account.access.companyMemberships
    .filter((membership) =>
      hasCompanyPermissionInAccess(
        account.access,
        membership.companyId,
        "customers.read",
      ),
    )
    .map((membership) => membership.companyId);
  const { limit, offset } = parsePagination(searchParams);
  if (allowedCompanyIds.length === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const allLeads: CRMLeadRecord[] = [];
  const extraParams = new URLSearchParams(searchParams);
  extraParams.delete("limit");
  extraParams.delete("offset");
  extraParams.delete("company_id");
  const extraQuery = extraParams.toString();
  for (const companyId of allowedCompanyIds) {
    const payload = await fetchCRMJSON<CRMListResponse<CRMLeadRecord>>(
      request,
      config,
      account,
      ["leads"],
      `?limit=100&offset=0&company_id=${encodeURIComponent(companyId)}${
        extraQuery ? `&${extraQuery}` : ""
      }`,
    );
    allLeads.push(...payload.data);
  }

  return Response.json({
    data: allLeads.slice(offset, offset + limit),
    limit,
    offset,
  });
}

async function listAuthorizedDeals(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
) {
  if (account.access.isSuperAdmin) {
    const upstreamResponse = await sendUpstreamRequest(request, config, account, ["deals"]);
    return relayUpstreamResponse(upstreamResponse);
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedCompanyId = searchParams.get("company_id")?.trim();
  if (requestedCompanyId) {
    if (
      !hasCompanyPermissionInAccess(
        account.access,
        requestedCompanyId,
        "customers.read",
      )
    ) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const upstreamResponse = await sendUpstreamRequest(request, config, account, ["deals"]);
    return relayUpstreamResponse(upstreamResponse);
  }

  const allowedCompanyIds = account.access.companyMemberships
    .filter((membership) =>
      hasCompanyPermissionInAccess(
        account.access,
        membership.companyId,
        "customers.read",
      ),
    )
    .map((membership) => membership.companyId);
  const { limit, offset } = parsePagination(searchParams);
  if (allowedCompanyIds.length === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const allDeals: CRMDealRecord[] = [];
  const extraParams = new URLSearchParams(searchParams);
  extraParams.delete("limit");
  extraParams.delete("offset");
  extraParams.delete("company_id");
  const extraQuery = extraParams.toString();
  for (const companyId of allowedCompanyIds) {
    const payload = await fetchCRMJSON<CRMListResponse<CRMDealRecord>>(
      request,
      config,
      account,
      ["deals"],
      `?limit=100&offset=0&company_id=${encodeURIComponent(companyId)}${
        extraQuery ? `&${extraQuery}` : ""
      }`,
    );
    allDeals.push(...payload.data);
  }

  return Response.json({
    data: allDeals.slice(offset, offset + limit),
    limit,
    offset,
  });
}

async function authorizeTaskById(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
  taskId: string,
  permission: "company.read" | "customers.write",
) {
  if (account.access.isSuperAdmin) {
    return null;
  }

  try {
    const task = await fetchCRMJSON<CRMTaskRecord>(
      request,
      config,
      account,
      ["tasks", taskId],
    );
    if (!task.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!hasCompanyPermissionInAccess(account.access, task.company_id, permission)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const createdByUserId = task.created_by_user_id?.trim() ?? "";
    const assigneeUserId = task.assignee_user_id?.trim() ?? "";
    const isRelevantToUser =
      createdByUserId === account.userId || assigneeUserId === account.userId;

    if (!isRelevantToUser) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return relayUpstreamResponse(error);
    }
    return Response.json({ error: "Failed to authorize task." }, { status: 500 });
  }

  return null;
}

async function loadAuthorizedTask(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
  taskId: string,
): Promise<CRMTaskRecord | Response> {
  if (account.access.isSuperAdmin) {
    return fetchCRMJSON<CRMTaskRecord>(request, config, account, ["tasks", taskId]);
  }

  try {
    const task = await fetchCRMJSON<CRMTaskRecord>(
      request,
      config,
      account,
      ["tasks", taskId],
    );

    if (!task.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!hasCompanyPermissionInAccess(account.access, task.company_id, "company.read")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const createdByUserId = task.created_by_user_id?.trim() ?? "";
    const assigneeUserId = task.assignee_user_id?.trim() ?? "";
    const isRelevantToUser =
      createdByUserId === account.userId || assigneeUserId === account.userId;

    if (!isRelevantToUser) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    return task;
  } catch (error) {
    if (error instanceof Response) {
      return relayUpstreamResponse(error);
    }
    return Response.json({ error: "Failed to authorize task." }, { status: 500 });
  }
}

async function listAuthorizedTasks(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
) {
  if (account.access.isSuperAdmin) {
    const upstreamResponse = await sendUpstreamRequest(request, config, account, ["tasks"]);
    return relayUpstreamResponse(upstreamResponse);
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedCompanyId = searchParams.get("company_id")?.trim();
  const extraParams = new URLSearchParams(searchParams);
  extraParams.delete("limit");
  extraParams.delete("offset");
  extraParams.delete("company_id");
  const extraQuery = extraParams.toString();
  if (requestedCompanyId) {
    if (!hasCompanyPermissionInAccess(account.access, requestedCompanyId, "company.read")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const allowedCompanyIds = requestedCompanyId
    ? [requestedCompanyId]
    : account.access.companyMemberships
        .filter((membership) =>
          hasCompanyPermissionInAccess(account.access, membership.companyId, "company.read"),
        )
        .map((membership) => membership.companyId);
  const { limit, offset } = parsePagination(searchParams);
  if (allowedCompanyIds.length === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const allTasks: CRMTaskRecord[] = [];
  for (const companyId of allowedCompanyIds) {
    const payload = await fetchCRMJSON<CRMListResponse<CRMTaskRecord>>(
      request,
      config,
      account,
      ["tasks"],
      `?limit=100&offset=0&company_id=${encodeURIComponent(companyId)}${
        extraQuery ? `&${extraQuery}` : ""
      }`,
    );
    allTasks.push(
      ...payload.data.filter((task) => {
        const createdByUserId = task.created_by_user_id?.trim() ?? "";
        const assigneeUserId = task.assignee_user_id?.trim() ?? "";
        return createdByUserId === account.userId || assigneeUserId === account.userId;
      }),
    );
  }

  return Response.json({
    data: allTasks.slice(offset, offset + limit),
    limit,
    offset,
  });
}

async function authorizeCalendarEventById(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
  eventId: string,
  permission: "company.read" | "customers.write",
) {
  if (account.access.isSuperAdmin) {
    return null;
  }

  try {
    const event = await fetchCRMJSON<CRMCalendarEventRecord>(
      request,
      config,
      account,
      ["calendar-events", eventId],
    );
    if (!event.company_id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    if (!hasCompanyPermissionInAccess(account.access, event.company_id, permission)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof Response) {
      return relayUpstreamResponse(error);
    }
    return Response.json({ error: "Failed to authorize calendar event." }, { status: 500 });
  }

  return null;
}

async function listAuthorizedCalendarEvents(
  request: NextRequest,
  config: { baseURL: string; apiKey: string },
  account: AccountProfile,
) {
  if (account.access.isSuperAdmin) {
    const upstreamResponse = await sendUpstreamRequest(
      request,
      config,
      account,
      ["calendar-events"],
    );
    return relayUpstreamResponse(upstreamResponse);
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedCompanyId = searchParams.get("company_id")?.trim();
  if (requestedCompanyId) {
    if (!hasCompanyPermissionInAccess(account.access, requestedCompanyId, "company.read")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const upstreamResponse = await sendUpstreamRequest(
      request,
      config,
      account,
      ["calendar-events"],
    );
    return relayUpstreamResponse(upstreamResponse);
  }

  const allowedCompanyIds = account.access.companyMemberships
    .filter((membership) =>
      hasCompanyPermissionInAccess(account.access, membership.companyId, "company.read"),
    )
    .map((membership) => membership.companyId);
  const { limit, offset } = parsePagination(searchParams);
  if (allowedCompanyIds.length === 0) {
    return Response.json({ data: [], limit, offset });
  }

  const allEvents: CRMCalendarEventRecord[] = [];
  const extraParams = new URLSearchParams(searchParams);
  extraParams.delete("limit");
  extraParams.delete("offset");
  extraParams.delete("company_id");
  const extraQuery = extraParams.toString();
  for (const companyId of allowedCompanyIds) {
    const payload = await fetchCRMJSON<CRMListResponse<CRMCalendarEventRecord>>(
      request,
      config,
      account,
      ["calendar-events"],
      `?limit=100&offset=0&company_id=${encodeURIComponent(companyId)}${
        extraQuery ? `&${extraQuery}` : ""
      }`,
    );
    allEvents.push(...payload.data);
  }

  return Response.json({
    data: allEvents.slice(offset, offset + limit),
    limit,
    offset,
  });
}

async function forwardRequest(
  request: NextRequest,
  context: RouteContext,
  account: AccountProfile,
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
      return listAuthorizedCompanies(request, config, account);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      if (!upstreamResponse.ok) {
        return relayUpstreamResponse(upstreamResponse);
      }

      const payload = (await upstreamResponse.json()) as CRMCompanyRecord;
      await addCompanyMembership(account.userId, { companyId: payload.id, role: "owner" });
      return Response.json(payload, { status: upstreamResponse.status });
    }

    if (resourceId) {
      let allowed = false;

      if (pathSegments.length === 2) {
        if (method === "DELETE") {
          allowed = hasCompanyPermissionInAccess(
            account.access,
            resourceId,
            "company.delete",
          );
        } else if (method === "PATCH" || method === "PUT") {
          allowed = hasCompanyPermissionInAccess(
            account.access,
            resourceId,
            "company.update",
          );
        } else {
          allowed = hasCompanyPermissionInAccess(
            account.access,
            resourceId,
            "company.read",
          );
        }
      } else if (pathSegments[2] === "import-profiles") {
        const action = pathSegments[3] ?? "";
        const permission =
          method === "GET" || action === "apply" ? "imports.run" : "imports.manage";
        allowed = hasCompanyPermissionInAccess(account.access, resourceId, permission);
      } else if (pathSegments[2] === "integrations") {
        // All /companies/:id/integrations/* paths (catalog GET + per-slug
        // config CRUD for greenapi, intranet, etc.) gate behind
        // integrations.manage. Owner-only as of Faz 0.1.
        allowed = hasCompanyPermissionInAccess(
          account.access,
          resourceId,
          "integrations.manage",
        );
      } else if (
        pathSegments[2] === "qualifier-config" ||
        pathSegments[2] === "qualifier-tokens" ||
        pathSegments[2] === "qualifier-rag-config" ||
        pathSegments[2] === "qualifier-rag-tokens" ||
        pathSegments[2] === "qualifier-connect" ||
        pathSegments[2] === "qualifier-disconnect"
      ) {
        allowed = hasCompanyPermissionInAccess(
          account.access,
          resourceId,
          "integrations.manage",
        );
      } else {
        allowed =
          method === "GET"
            ? hasCompanyPermissionInAccess(account.access, resourceId, "company.read")
            : hasCompanyPermissionInAccess(account.access, resourceId, "company.update");
      }

      if (!allowed) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      // The qualifier endpoints live under /internal/company/:id/* on the
      // CRM side (singular "company", internal prefix). Rewrite the path
      // before forwarding so the BFF's public URL can stay symmetric with
      // the rest of the /companies/:id/* surface.
      let upstreamSegments = pathSegments;
      if (
        pathSegments[2] === "qualifier-config" ||
        pathSegments[2] === "qualifier-tokens" ||
        pathSegments[2] === "qualifier-rag-config" ||
        pathSegments[2] === "qualifier-rag-tokens" ||
        pathSegments[2] === "qualifier-connect" ||
        pathSegments[2] === "qualifier-disconnect"
      ) {
        upstreamSegments = rewriteQualifierPath(pathSegments);
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        upstreamSegments,
      );
      if (method === "DELETE" && upstreamResponse.ok && pathSegments.length === 2) {
        await removeCompanyFromAllMembers(resourceId);
      }
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "customers") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedCustomers(request, config, account);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const body = await readJSONBody(request);
      const companyId =
        typeof body?.company_id === "string" ? body.company_id.trim() : "";
      if (!companyId) {
        return Response.json({ error: "company_id is required" }, { status: 400 });
      }

      if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }

    if (resourceId) {
      const authFailure = await authorizeCustomerById(
        request,
        config,
        account,
        resourceId,
        method === "GET" ? "customers.read" : "customers.write",
      );
      if (authFailure) {
        return authFailure;
      }

      if (method === "PATCH" || method === "PUT") {
        const body = await readJSONBody(request);
        const companyId =
          typeof body?.company_id === "string" ? body.company_id.trim() : "";
        if (companyId) {
          if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
            return Response.json({ error: "forbidden" }, { status: 403 });
          }
        }
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "leads") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedLeads(request, config, account);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const body = await readJSONBody(request);
      const companyId =
        typeof body?.company_id === "string" ? body.company_id.trim() : "";
      if (!companyId) {
        return Response.json({ error: "company_id is required" }, { status: 400 });
      }

      if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }

    if (resourceId) {
      const authFailure = await authorizeLeadById(
        request,
        config,
        account,
        resourceId,
        method === "GET" ? "customers.read" : "customers.write",
      );
      if (authFailure) {
        return authFailure;
      }

      if (method === "PATCH" || method === "PUT") {
        const body = await readJSONBody(request);
        const companyId =
          typeof body?.company_id === "string" ? body.company_id.trim() : "";
        if (companyId) {
          if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
            return Response.json({ error: "forbidden" }, { status: 403 });
          }
        }
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "deals") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedDeals(request, config, account);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const body = await readJSONBody(request);
      const companyId =
        typeof body?.company_id === "string" ? body.company_id.trim() : "";
      if (!companyId) {
        return Response.json({ error: "company_id is required" }, { status: 400 });
      }

      if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }

    if (resourceId) {
      const authFailure = await authorizeDealById(
        request,
        config,
        account,
        resourceId,
        method === "GET" ? "customers.read" : "customers.write",
      );
      if (authFailure) {
        return authFailure;
      }

      if (method === "PATCH" || method === "PUT") {
        const body = await readJSONBody(request);
        const companyId =
          typeof body?.company_id === "string" ? body.company_id.trim() : "";
        if (companyId) {
          if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
            return Response.json({ error: "forbidden" }, { status: 403 });
          }
        }
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "tasks") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedTasks(request, config, account);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const body = await readJSONBody(request);
      const companyId =
        typeof body?.company_id === "string" ? body.company_id.trim() : "";
      if (!companyId) {
        return Response.json({ error: "company_id is required" }, { status: 400 });
      }

      if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }

    if (resourceId) {
      const authFailure = await authorizeTaskById(
        request,
        config,
        account,
        resourceId,
        method === "GET" ? "company.read" : "customers.write",
      );
      if (authFailure) {
        return authFailure;
      }

      if (method === "DELETE") {
        const task = await loadAuthorizedTask(request, config, account, resourceId);
        if (task instanceof Response) {
          return task;
        }

        if (!account.access.isSuperAdmin) {
          const createdByUserId = task.created_by_user_id?.trim() ?? "";
          if (createdByUserId !== account.userId) {
            return Response.json(
              { error: "Only the task publisher can delete this task." },
              { status: 403 },
            );
          }
        }
      }

      if (method === "PATCH" || method === "PUT") {
        const body = await readJSONBody(request);
        const companyId =
          typeof body?.company_id === "string" ? body.company_id.trim() : "";
        if (companyId) {
          if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
            return Response.json({ error: "forbidden" }, { status: 403 });
          }
        }
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "calendar-events") {
    if (method === "GET" && pathSegments.length === 1) {
      return listAuthorizedCalendarEvents(request, config, account);
    }

    if (method === "POST" && pathSegments.length === 1) {
      const body = await readJSONBody(request);
      const companyId =
        typeof body?.company_id === "string" ? body.company_id.trim() : "";
      if (!companyId) {
        return Response.json({ error: "company_id is required" }, { status: 400 });
      }

      if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }

    if (resourceId) {
      const authFailure = await authorizeCalendarEventById(
        request,
        config,
        account,
        resourceId,
        method === "GET" ? "company.read" : "customers.write",
      );
      if (authFailure) {
        return authFailure;
      }

      if (method === "PATCH" || method === "PUT") {
        const body = await readJSONBody(request);
        const companyId =
          typeof body?.company_id === "string" ? body.company_id.trim() : "";
        if (companyId) {
          if (!hasCompanyPermissionInAccess(account.access, companyId, "customers.write")) {
            return Response.json({ error: "forbidden" }, { status: 403 });
          }
        }
      }

      const upstreamResponse = await sendUpstreamRequest(
        request,
        config,
        account,
        pathSegments,
      );
      return relayUpstreamResponse(upstreamResponse);
    }
  }

  if (resource === "internal" && pathSegments[1] === "company" && pathSegments[2]) {
    const companyId = pathSegments[2];
    // qualifier config/token + rag token management is an owner-only
    // integration surface (Faz 0.1 tightened integrations.manage).
    if (!hasCompanyPermissionInAccess(account.access, companyId, "integrations.manage")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const upstreamResponse = await sendUpstreamRequest(
      request,
      config,
      account,
      pathSegments,
    );
    return relayUpstreamResponse(upstreamResponse);
  }

  if (resource === "companies" && resourceId) {
    if (!canAccessCompanyInAccess(account.access, resourceId)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  if (resource === "customers" && resourceId) {
    const authFailure = await authorizeCustomerById(
      request,
      config,
      account,
      resourceId,
      method === "GET" ? "customers.read" : "customers.write",
    );
    if (authFailure) {
      return authFailure;
    }
  }

  if (resource === "leads" && resourceId) {
    const authFailure = await authorizeLeadById(
      request,
      config,
      account,
      resourceId,
      method === "GET" ? "customers.read" : "customers.write",
    );
    if (authFailure) {
      return authFailure;
    }
  }

  if (resource === "deals" && resourceId) {
    const authFailure = await authorizeDealById(
      request,
      config,
      account,
      resourceId,
      method === "GET" ? "customers.read" : "customers.write",
    );
    if (authFailure) {
      return authFailure;
    }
  }

  if (resource === "tasks" && resourceId) {
    const authFailure = await authorizeTaskById(
      request,
      config,
      account,
      resourceId,
      method === "GET" ? "company.read" : "customers.write",
    );
    if (authFailure) {
      return authFailure;
    }
  }

  if (resource === "calendar-events" && resourceId) {
    const authFailure = await authorizeCalendarEventById(
      request,
      config,
      account,
      resourceId,
      method === "GET" ? "company.read" : "customers.write",
    );
    if (authFailure) {
      return authFailure;
    }
  }

  const upstreamResponse = await sendUpstreamRequest(request, config, account, pathSegments);
  return relayUpstreamResponse(upstreamResponse);
}

async function handle(request: NextRequest, context: RouteContext) {
  ensureBackendSuperTokensInit(request);
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

    const account = await loadAccountProfile(session.getUserId());
    if (!account) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    return forwardRequest(request, context, account);
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
