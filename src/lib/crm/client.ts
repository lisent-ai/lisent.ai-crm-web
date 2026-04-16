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

type CRMLeadRecord = {
  id: string;
  customer_id?: string | null;
  company_id?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: string;
  source?: string;
  assignee_user_id?: string;
  assignee_user_name?: string;
  assignment_method?: string;
  value?: number;
  converted_customer_id?: string | null;
  converted_deal_id?: string | null;
  converted_at?: string | null;
  extra_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type CRMDealRecord = {
  id: string;
  customer_id?: string | null;
  company_id?: string | null;
  source_lead_id?: string | null;
  name?: string;
  stage?: string;
  amount?: number;
  currency?: string;
  close_date?: string | null;
  termination_date?: string | null;
  won_reason?: string | null;
  loss_reason?: string | null;
  assignee_user_id?: string | null;
  assignee_user_name?: string | null;
  extra_data?: Record<string, unknown>;
  stage_history?: CRMDealStageHistoryRecord[];
  created_at: string;
  updated_at: string;
};

type CRMDealStageHistoryRecord = {
  id: string;
  deal_id: string;
  stage?: string;
  entered_at: string;
  exited_at?: string | null;
  changed_by_user_id?: string | null;
  changed_by_user_name?: string | null;
  created_at: string;
  updated_at: string;
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
  extraData: Record<string, string>;
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

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "lost"
  | "converted";

export type LeadAssignmentMethod = "manual" | "round_robin";

export type Lead = {
  id: string;
  customerId: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: LeadStatus;
  source: string;
  assigneeUserId: string;
  assigneeUserName: string;
  assignmentMethod: LeadAssignmentMethod;
  value: number;
  convertedCustomerId: string;
  convertedDealId: string;
  convertedAt: string;
  extraData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type Deal = {
  id: string;
  customerId: string;
  companyId: string;
  sourceLeadId: string;
  name: string;
  stage: DealStage;
  amount: number;
  currency: string;
  closeDate: string;
  terminationDate: string;
  wonReason: string;
  lossReason: string;
  assigneeUserId: string;
  assigneeUserName: string;
  extraData: Record<string, string>;
  stageHistory: DealStageHistory[];
  createdAt: string;
  updatedAt: string;
};

export type DealStage =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type DealStageHistory = {
  id: string;
  dealId: string;
  stage: DealStage;
  enteredAt: string;
  exitedAt: string;
  changedByUserId: string;
  changedByUserName: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadFilters = {
  status?: string;
  source?: string;
  assigneeUserId?: string;
  q?: string;
  unassigned?: boolean;
};

export type DealFilters = {
  stage?: string;
  assigneeUserId?: string;
  q?: string;
};

export type UpsertLeadInput = {
  companyId: string;
  customerId?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: LeadStatus;
  source: string;
  assigneeUserId: string;
  assigneeUserName: string;
  assignmentMethod: LeadAssignmentMethod;
  value: number;
  extraData?: Record<string, string>;
};

export type ConvertLeadInput = {
  customer: {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone: string;
    preferredLanguage?: string;
    countryCode?: string;
    extraData?: Record<string, string>;
  };
  deal?: {
    stage: string;
    amount?: number;
    closeDate?: string;
    extraData?: Record<string, string>;
  } | null;
};

export type UpsertDealInput = {
  companyId: string;
  customerId?: string;
  sourceLeadId?: string;
  name: string;
  stage: DealStage;
  amount: number;
  currency: string;
  closeDate?: string;
  terminationDate?: string;
  wonReason: string;
  lossReason: string;
  assigneeUserId: string;
  assigneeUserName: string;
  extraData?: Record<string, string>;
};

export type LeadConversionResult = {
  lead: Lead;
  customer: Customer;
  deal: Deal | null;
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
    extraData: normalizeExtraData(record.extra_data),
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

function mapLead(record: CRMLeadRecord): Lead {
  return {
    id: record.id,
    customerId: record.customer_id ?? "",
    companyId: record.company_id ?? "",
    name: record.name?.trim() || "",
    email: record.email?.trim() || "",
    phone: record.phone?.trim() || "",
    notes: record.notes?.trim() || "",
    status: (record.status?.trim() || "new") as LeadStatus,
    source: record.source?.trim() || "",
    assigneeUserId: record.assignee_user_id?.trim() || "",
    assigneeUserName: record.assignee_user_name?.trim() || "",
    assignmentMethod:
      (record.assignment_method?.trim() || "manual") as LeadAssignmentMethod,
    value: Number(record.value ?? 0),
    convertedCustomerId: record.converted_customer_id ?? "",
    convertedDealId: record.converted_deal_id ?? "",
    convertedAt: record.converted_at ?? "",
    extraData: normalizeExtraData(record.extra_data),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDeal(record: CRMDealRecord): Deal {
  return {
    id: record.id,
    customerId: record.customer_id ?? "",
    companyId: record.company_id ?? "",
    sourceLeadId: record.source_lead_id ?? "",
    name: record.name?.trim() || "Untitled deal",
    stage: (record.stage?.trim() || "new") as DealStage,
    amount: Number(record.amount ?? 0),
    currency: record.currency?.trim() || "EUR",
    closeDate: record.close_date ?? "",
    terminationDate: record.termination_date ?? "",
    wonReason: record.won_reason?.trim() || "",
    lossReason: record.loss_reason?.trim() || "",
    assigneeUserId: record.assignee_user_id?.trim() || "",
    assigneeUserName: record.assignee_user_name?.trim() || "",
    extraData: normalizeExtraData(record.extra_data),
    stageHistory: (record.stage_history ?? []).map((entry) => ({
      id: entry.id,
      dealId: entry.deal_id,
      stage: (entry.stage?.trim() || "new") as DealStage,
      enteredAt: entry.entered_at,
      exitedAt: entry.exited_at ?? "",
      changedByUserId: entry.changed_by_user_id?.trim() || "",
      changedByUserName: entry.changed_by_user_name?.trim() || "",
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listCompanies(): Promise<Company[]> {
  const response = await requestCRM<CRMListResponse<CRMCompanyRecord>>(
    "/companies?limit=100&offset=0",
  );
  return response.data.map(mapCompany);
}

export async function getCompany(companyId: string): Promise<Company> {
  const response = await requestCRM<CRMCompanyRecord>(`/companies/${companyId}`);
  return mapCompany(response);
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

export async function updateCompanyExtraData(
  companyId: string,
  extraData: Record<string, string>,
): Promise<Company> {
  const payload = await requestCRM<CRMCompanyRecord>(`/companies/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extra_data: extraData,
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

export async function listLeads(
  companyId: string,
  filters: LeadFilters = {},
): Promise<Lead[]> {
  const query = new URLSearchParams({
    limit: "100",
    offset: "0",
    company_id: companyId,
  });

  if (filters.status?.trim()) {
    query.set("status", filters.status.trim());
  }
  if (filters.source?.trim()) {
    query.set("source", filters.source.trim());
  }
  if (filters.assigneeUserId?.trim()) {
    query.set("assignee_user_id", filters.assigneeUserId.trim());
  }
  if (filters.q?.trim()) {
    query.set("q", filters.q.trim());
  }
  if (filters.unassigned) {
    query.set("unassigned", "true");
  }

  const response = await requestCRM<CRMListResponse<CRMLeadRecord>>(
    `/leads?${query.toString()}`,
  );
  return response.data.map(mapLead);
}

export async function createLead(input: UpsertLeadInput): Promise<Lead> {
  const payload = await requestCRM<CRMLeadRecord>("/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || undefined,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      notes: input.notes.trim(),
      status: input.status,
      source: input.source.trim(),
      assignee_user_id: input.assigneeUserId.trim(),
      assignee_user_name: input.assigneeUserName.trim(),
      assignment_method: input.assignmentMethod,
      value: input.value,
      extra_data: input.extraData ?? {},
    }),
  });
  return mapLead(payload);
}

export async function updateLead(
  leadId: string,
  input: UpsertLeadInput,
): Promise<Lead> {
  const payload = await requestCRM<CRMLeadRecord>(`/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || null,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      notes: input.notes.trim(),
      status: input.status,
      source: input.source.trim(),
      assignee_user_id: input.assigneeUserId.trim(),
      assignee_user_name: input.assigneeUserName.trim(),
      assignment_method: input.assignmentMethod,
      value: input.value,
      extra_data: input.extraData ?? {},
    }),
  });
  return mapLead(payload);
}

export async function deleteLead(leadId: string): Promise<void> {
  await requestCRM<void>(`/leads/${leadId}`, {
    method: "DELETE",
  });
}

export async function listDeals(
  companyId: string,
  filters: DealFilters = {},
): Promise<Deal[]> {
  const query = new URLSearchParams({
    limit: "100",
    offset: "0",
    company_id: companyId,
  });

  if (filters.stage?.trim()) {
    query.set("stage", filters.stage.trim());
  }
  if (filters.assigneeUserId?.trim()) {
    query.set("assignee_user_id", filters.assigneeUserId.trim());
  }
  if (filters.q?.trim()) {
    query.set("q", filters.q.trim());
  }

  const response = await requestCRM<CRMListResponse<CRMDealRecord>>(
    `/deals?${query.toString()}`,
  );
  return response.data.map(mapDeal);
}

export async function createDeal(input: UpsertDealInput): Promise<Deal> {
  const payload = await requestCRM<CRMDealRecord>("/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || undefined,
      source_lead_id: input.sourceLeadId?.trim() || undefined,
      name: input.name.trim(),
      stage: input.stage,
      amount: input.amount,
      currency: input.currency.trim(),
      close_date: input.closeDate?.trim(),
      termination_date: input.terminationDate?.trim(),
      won_reason: input.wonReason.trim(),
      loss_reason: input.lossReason.trim(),
      assignee_user_id: input.assigneeUserId.trim(),
      assignee_user_name: input.assigneeUserName.trim(),
      extra_data: input.extraData ?? {},
    }),
  });

  return mapDeal(payload);
}

export async function updateDeal(
  dealId: string,
  input: UpsertDealInput,
): Promise<Deal> {
  const payload = await requestCRM<CRMDealRecord>(`/deals/${dealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || null,
      source_lead_id: input.sourceLeadId?.trim() || null,
      name: input.name.trim(),
      stage: input.stage,
      amount: input.amount,
      currency: input.currency.trim(),
      close_date: input.closeDate?.trim() || null,
      termination_date: input.terminationDate?.trim() || null,
      won_reason: input.wonReason.trim(),
      loss_reason: input.lossReason.trim(),
      assignee_user_id: input.assigneeUserId.trim(),
      assignee_user_name: input.assigneeUserName.trim(),
      extra_data: input.extraData ?? {},
    }),
  });

  return mapDeal(payload);
}

export async function deleteDeal(dealId: string): Promise<void> {
  await requestCRM<void>(`/deals/${dealId}`, {
    method: "DELETE",
  });
}

export async function convertLead(
  leadId: string,
  input: ConvertLeadInput,
): Promise<LeadConversionResult> {
  const payload = await requestCRM<{
    lead: CRMLeadRecord;
    customer: CRMCustomerRecord;
    deal?: CRMDealRecord | null;
  }>(`/leads/${leadId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: {
        name: input.customer.name.trim(),
        first_name: input.customer.firstName?.trim(),
        last_name: input.customer.lastName?.trim(),
        email: input.customer.email.trim(),
        phone: input.customer.phone.trim(),
        preferred_language: input.customer.preferredLanguage?.trim(),
        country_code: input.customer.countryCode?.trim(),
        extra_data: input.customer.extraData ?? {},
      },
      deal: input.deal
        ? {
            stage: input.deal.stage.trim(),
            amount: input.deal.amount,
            close_date: input.deal.closeDate?.trim(),
            extra_data: input.deal.extraData ?? {},
          }
        : null,
    }),
  });

  return {
    lead: mapLead(payload.lead),
    customer: mapCustomer(payload.customer),
    deal: payload.deal ? mapDeal(payload.deal) : null,
  };
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
