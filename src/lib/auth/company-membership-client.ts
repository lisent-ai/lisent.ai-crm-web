import type { CompanyRole, PlatformRole } from "@/lib/auth/roles";

type CompanyMembershipErrorPayload = {
  error?: string;
};

type CompanyMembershipListResponse = {
  data: CompanyMember[];
};

export type CompanyMember = {
  userId: string;
  companyId: string;
  role: CompanyRole;
  roleLabel: string;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  email: string;
  platformRole: PlatformRole | null;
  isSuperAdmin: boolean;
  isCurrentUser?: boolean;
};

export class CompanyMembershipClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CompanyMembershipClientError";
    this.status = status;
  }
}

async function requestCompanyMemberships<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | CompanyMembershipErrorPayload
    | null;

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as CompanyMembershipErrorPayload)
        : null;

    throw new CompanyMembershipClientError(
      errorPayload?.error ?? "Company membership request failed.",
      response.status,
    );
  }

  return payload as T;
}

export async function listCompanyMembers(companyId: string) {
  const query = new URLSearchParams({ company_id: companyId });
  const response = await requestCompanyMemberships<CompanyMembershipListResponse>(
    `/api/company-memberships?${query.toString()}`,
    { method: "GET" },
  );
  return response.data;
}

export function addCompanyMember(input: {
  companyId: string;
  email: string;
  role: CompanyRole;
}) {
  return requestCompanyMemberships<CompanyMember>("/api/company-memberships", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCompanyMemberRole(input: {
  userId: string;
  companyId: string;
  role: CompanyRole;
}) {
  const query = new URLSearchParams({ company_id: input.companyId });
  return requestCompanyMemberships<CompanyMember>(
    `/api/company-memberships/${encodeURIComponent(input.userId)}?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role: input.role }),
    },
  );
}

export async function removeCompanyMember(input: {
  userId: string;
  companyId: string;
}) {
  const query = new URLSearchParams({ company_id: input.companyId });
  await requestCompanyMemberships<void>(
    `/api/company-memberships/${encodeURIComponent(input.userId)}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}
