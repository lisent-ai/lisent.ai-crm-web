"use client";

type CRMListResponse<T> = {
  data: T[];
  limit: number;
  offset: number;
};

type CRMCompanyRecord = {
  id: string;
  name: string;
  industry?: string;
  created_by_user_id?: string;
  created_by_user_name?: string;
  extra_data?: Record<string, unknown>;
};

type CRMCustomerRecord = {
  id: string;
  company_id?: string | null;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  preferred_language?: string;
  country_code?: string;
  extra_data?: Record<string, unknown>;
};

type MappingSuggestion = {
  target_field: string;
  source_headers: string[];
  confidence: number;
  reason: string;
};

type FieldDefinition = {
  name: string;
  description: string;
  examples: string[];
};

type SuggestFromCSVResponse = {
  headers: string[];
  sample_rows: Record<string, unknown>[];
  data: {
    suggestions: MappingSuggestion[];
    available_fields: FieldDefinition[];
  };
};

export type Company = {
  id: string;
  name: string;
  country: string;
  industry: string;
  createdByUserId: string;
  createdByUserName: string;
};

export type Customer = {
  id: string;
  companyId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  preferredLanguage: string;
  countryCode: string;
  extraData: Record<string, string>;
};

export type ImportSuggestion = {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  suggestions: MappingSuggestion[];
  availableFields: FieldDefinition[];
};

type ImportApplyResponse = {
  payload: Record<string, unknown>;
};

export class CRMClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CRMClientError";
    this.status = status;
  }
}

async function requestCRM<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/crm${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    let message = `CRM request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body.error === "string" && body.error.trim() !== "") {
        message = body.error;
      }
    } catch {
      // ignore JSON parse errors for non-JSON error bodies
    }
    throw new CRMClientError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeExtraData(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      String(item),
    ]),
  );
}

function mapCompany(record: CRMCompanyRecord): Company {
  const extra = record.extra_data ?? {};
  const countryValue =
    typeof extra.country === "string"
      ? extra.country
      : typeof extra.country_code === "string"
        ? extra.country_code
        : "Not set";

  return {
    id: record.id,
    name: record.name,
    country: countryValue.trim() || "Not set",
    industry: record.industry?.trim() || "Not set",
    createdByUserId: record.created_by_user_id?.trim() || "",
    createdByUserName: record.created_by_user_name?.trim() || "Unknown",
  };
}

function deriveNameParts(name: string): { firstName: string; lastName: string } {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const firstName = tokens[0] ?? "";
  const lastName = tokens.slice(1).join(" ");
  return { firstName, lastName };
}

function mapCustomer(record: CRMCustomerRecord): Customer {
  const extraData = normalizeExtraData(record.extra_data);
  const fallbackParts = deriveNameParts(record.name ?? "");

  return {
    id: record.id,
    companyId: record.company_id ?? "",
    name: record.name ?? "",
    firstName: record.first_name?.trim() || fallbackParts.firstName,
    lastName: record.last_name?.trim() || fallbackParts.lastName,
    email: record.email?.trim() || "",
    phone: record.phone?.trim() || "",
    status: extraData.status?.trim() || "Active",
    preferredLanguage: record.preferred_language?.trim() || "en",
    countryCode: record.country_code?.trim() || "--",
    extraData,
  };
}

export async function listCompanies(): Promise<Company[]> {
  const response = await requestCRM<CRMListResponse<CRMCompanyRecord>>(
    "/companies?limit=100&offset=0",
  );
  return response.data.map(mapCompany);
}

export async function createCompany(input: {
  name: string;
  industry: string;
  country: string;
}): Promise<Company> {
  const payload = await requestCRM<CRMCompanyRecord>("/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      industry: input.industry.trim(),
      extra_data: {
        country: input.country.trim(),
      },
    }),
  });
  return mapCompany(payload);
}

export async function deleteCompany(companyId: string): Promise<void> {
  await requestCRM<void>(`/companies/${companyId}`, {
    method: "DELETE",
  });
}

export async function listCustomers(companyId: string): Promise<Customer[]> {
  const query = new URLSearchParams({
    limit: "100",
    offset: "0",
    company_id: companyId,
  });

  const response = await requestCRM<CRMListResponse<CRMCustomerRecord>>(
    `/customers?${query.toString()}`,
  );
  return response.data.map(mapCustomer);
}

export async function listAllCustomers(): Promise<Customer[]> {
  const response = await requestCRM<CRMListResponse<CRMCustomerRecord>>(
    "/customers?limit=100&offset=0",
  );
  return response.data.map(mapCustomer);
}

async function assignCustomerToCompany(
  customerId: string,
  companyId: string,
): Promise<Customer> {
  const payload = await requestCRM<CRMCustomerRecord>(`/customers/${customerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: companyId,
    }),
  });

  return mapCustomer(payload);
}

async function ensureCustomerCompany(
  customer: Customer,
  companyId: string,
): Promise<Customer> {
  if (!companyId.trim()) {
    return customer;
  }

  if (!customer.companyId) {
    return assignCustomerToCompany(customer.id, companyId);
  }

  if (customer.companyId !== companyId) {
    throw new CRMClientError(
      "Customer already exists under a different company.",
      409,
    );
  }

  return customer;
}

type UpsertCustomerInput = {
  companyId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  preferredLanguage: string;
  countryCode: string;
  extraData: Record<string, string>;
};

export async function createCustomer(input: UpsertCustomerInput): Promise<Customer> {
  const parts = deriveNameParts(input.name);
  const payload = await requestCRM<CRMCustomerRecord>("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      name: input.name.trim(),
      first_name: parts.firstName,
      last_name: parts.lastName,
      email: input.email.trim(),
      phone: input.phone.trim(),
      preferred_language: input.preferredLanguage.trim(),
      country_code: input.countryCode.trim(),
      extra_data: {
        ...input.extraData,
        status: input.status.trim(),
      },
    }),
  });
  return ensureCustomerCompany(mapCustomer(payload), input.companyId);
}

export async function updateCustomer(
  customerId: string,
  input: UpsertCustomerInput,
): Promise<Customer> {
  const parts = deriveNameParts(input.name);
  const payload = await requestCRM<CRMCustomerRecord>(`/customers/${customerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      name: input.name.trim(),
      first_name: parts.firstName,
      last_name: parts.lastName,
      email: input.email.trim(),
      phone: input.phone.trim(),
      preferred_language: input.preferredLanguage.trim(),
      country_code: input.countryCode.trim(),
      extra_data: {
        ...input.extraData,
        status: input.status.trim(),
      },
    }),
  });
  return mapCustomer(payload);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await requestCRM<void>(`/customers/${customerId}`, {
    method: "DELETE",
  });
}

export async function suggestImportFromCSVUpload(
  companyId: string,
  file: File,
): Promise<ImportSuggestion> {
  const formData = new FormData();
  formData.set("entity_type", "customer");
  formData.set("file", file);

  const response = await requestCRM<SuggestFromCSVResponse>(
    `/companies/${companyId}/import-profiles/suggest-from-csv`,
    {
      method: "POST",
      body: formData,
    },
  );

  return {
    headers: response.headers,
    sampleRows: response.sample_rows,
    suggestions: response.data.suggestions,
    availableFields: response.data.available_fields,
  };
}

export async function suggestImportFromCSVURL(
  companyId: string,
  fileURL: string,
): Promise<ImportSuggestion> {
  const response = await requestCRM<SuggestFromCSVResponse>(
    `/companies/${companyId}/import-profiles/suggest-from-csv`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "customer",
        file_url: fileURL.trim(),
      }),
    },
  );

  return {
    headers: response.headers,
    sampleRows: response.sample_rows,
    suggestions: response.data.suggestions,
    availableFields: response.data.available_fields,
  };
}

export async function approveImportProfile(
  companyId: string,
  mappingByField: Record<string, string[]>,
  fallbackAliasesEnabled: boolean,
): Promise<void> {
  await requestCRM(`/companies/${companyId}/import-profiles/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity_type: "customer",
      mapping: {
        fields: mappingByField,
        fallback_aliases_enabled: fallbackAliasesEnabled,
        unmapped_policy: "extra_data",
      },
    }),
  });
}

export async function applyImportProfile(
  companyId: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await requestCRM<ImportApplyResponse>(
    `/companies/${companyId}/import-profiles/apply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: "customer",
        row,
      }),
    },
  );

  return response.payload;
}

// ─── GreenAPI / WhatsApp Entegrasyonu ────────────────────────────────────────

type CRMGreenAPIRecord = {
  id: string;
  company_id: string;
  id_instance: string;
  api_token_masked: string;
  webhook_url_token?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GreenAPIIntegration = {
  id: string;
  companyId: string;
  idInstance: string;
  apiTokenMasked: string;
  webhookUrlToken: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapGreenAPIIntegration(record: CRMGreenAPIRecord): GreenAPIIntegration {
  return {
    id: record.id,
    companyId: record.company_id,
    idInstance: record.id_instance,
    apiTokenMasked: record.api_token_masked,
    webhookUrlToken: record.webhook_url_token ?? null,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getGreenAPIIntegration(
  companyId: string,
): Promise<GreenAPIIntegration | null> {
  try {
    const record = await requestCRM<CRMGreenAPIRecord>(
      `/companies/${companyId}/integrations/greenapi`,
    );
    return mapGreenAPIIntegration(record);
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
}

export async function upsertGreenAPIIntegration(
  companyId: string,
  input: { idInstance: string; apiTokenInstance: string; webhookUrlToken?: string },
): Promise<GreenAPIIntegration> {
  const record = await requestCRM<CRMGreenAPIRecord>(
    `/companies/${companyId}/integrations/greenapi`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_instance: input.idInstance,
        api_token_instance: input.apiTokenInstance,
        webhook_url_token: input.webhookUrlToken,
      }),
    },
  );
  return mapGreenAPIIntegration(record);
}

export async function deleteGreenAPIIntegration(companyId: string): Promise<void> {
  await requestCRM<void>(`/companies/${companyId}/integrations/greenapi`, {
    method: "DELETE",
  });
}

// ─── AI Lead Qualifier Webhook Token ─────────────────────────────────────────

export type QualifierTokenResponse = {
  companyId: string;
  token: string;
  webhookUrl: string;
};

export type QualifierConfigResponse = {
  companyId: string;
  token: string | null;
  webhookUrl: string | null;
  fallbackUrl: string | null;
};

export async function generateQualifierToken(
  companyId: string,
): Promise<QualifierTokenResponse> {
  const record = await requestCRM<{ company_id: string; token: string; webhook_url: string }>(
    `/internal/company/${companyId}/generate-qualifier-token`,
    { method: "POST" },
  );
  return {
    companyId: record.company_id,
    token: record.token,
    webhookUrl: record.webhook_url,
  };
}

export async function getQualifierConfig(
  companyId: string,
): Promise<QualifierConfigResponse | null> {
  try {
    const record = await requestCRM<{
      company_id: string;
      token: string | null;
      webhook_url: string | null;
      fallback_url: string | null;
    }>(`/internal/company/${companyId}/qualifier-config`);
    return {
      companyId: record.company_id,
      token: record.token ?? null,
      webhookUrl: record.webhook_url ?? null,
      fallbackUrl: record.fallback_url ?? null,
    };
  } catch {
    return null;
  }
}

export async function updateQualifierFallbackUrl(
  companyId: string,
  fallbackUrl: string,
): Promise<void> {
  await requestCRM<void>(`/internal/company/${companyId}/qualifier-config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fallback_url: fallbackUrl }),
  });
}

// ─── RAG Webhook ────────────────────────────────────────────────────────────

export type RAGTokenResponse = {
  companyId: string;
  token: string;
  webhookUrl: string;
};

export type RAGConfigResponse = {
  companyId: string;
  token: string | null;
  webhookUrl: string | null;
};

export type WebhookDataEntry = {
  id: string;
  companyId: string;
  label: string;
  payload: unknown;
  receivedAt: string;
};

export type WebhookDataListItem = {
  id: string;
  companyId: string;
  label: string;
  payloadSize: number;
  receivedAt: string;
};

export async function generateRAGToken(
  companyId: string,
): Promise<RAGTokenResponse> {
  const record = await requestCRM<{
    company_id: string;
    token: string;
    webhook_url: string;
  }>(`/internal/company/${companyId}/generate-rag-token`, { method: "POST" });
  return {
    companyId: record.company_id,
    token: record.token,
    webhookUrl: record.webhook_url,
  };
}

export async function getRAGConfig(
  companyId: string,
): Promise<RAGConfigResponse | null> {
  try {
    const record = await requestCRM<{
      company_id: string;
      token: string | null;
      webhook_url: string | null;
    }>(`/internal/company/${companyId}/rag-config`);
    return {
      companyId: record.company_id,
      token: record.token ?? null,
      webhookUrl: record.webhook_url ?? null,
    };
  } catch {
    return null;
  }
}

export async function listWebhookData(
  companyId: string,
): Promise<WebhookDataListItem[]> {
  try {
    const res = await requestCRM<
      {
        id: string;
        company_id: string;
        label: string;
        payload_size: number;
        received_at: string;
      }[]
    >(`/internal/company/${companyId}/webhook-data`);
    return res.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      label: r.label,
      payloadSize: r.payload_size,
      receivedAt: r.received_at,
    }));
  } catch {
    return [];
  }
}

export async function getWebhookDataDetail(
  companyId: string,
  dataId: string,
): Promise<WebhookDataEntry> {
  const record = await requestCRM<{
    id: string;
    company_id: string;
    label: string;
    payload: unknown;
    received_at: string;
  }>(`/internal/company/${companyId}/webhook-data/${dataId}`);
  return {
    id: record.id,
    companyId: record.company_id,
    label: record.label,
    payload: record.payload,
    receivedAt: record.received_at,
  };
}

export async function deleteWebhookData(
  companyId: string,
  dataId: string,
): Promise<void> {
  await requestCRM<void>(
    `/internal/company/${companyId}/webhook-data/${dataId}`,
    { method: "DELETE" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export async function createCustomerFromImportPayload(
  companyId: string,
  payload: Record<string, unknown>,
): Promise<Customer> {
  const response = await requestCRM<CRMCustomerRecord>("/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      company_id: companyId,
    }),
  });

  return ensureCustomerCompany(mapCustomer(response), companyId);
}
