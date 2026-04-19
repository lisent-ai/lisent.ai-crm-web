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

  // AI Lead Qualifier write-through metadata — all nullable.
  ai_score?: number | null;
  ai_status?: string | null;
  ai_session_id?: string | null;
  ai_champ?: Record<string, unknown> | null;
  ai_reasoning?: Record<string, unknown> | null;
  ai_score_breakdown?: Record<string, unknown> | null;
  ai_last_scored_at?: string | null;
  ai_path?: string | null;
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
  comments?: CRMDealCommentRecord[];
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

type CRMDealCommentRecord = {
  id: string;
  deal_id: string;
  body: string;
  author_user_id?: string | null;
  author_user_name?: string | null;
  created_at: string;
  updated_at: string;
};

type CRMTaskRecord = {
  id: string;
  company_id?: string | null;
  customer_id?: string | null;
  title?: string;
  note?: string;
  due_date?: string | null;
  status?: string;
  assignee_user_id?: string | null;
  assignee_user_name?: string | null;
  created_by_user_id?: string | null;
  created_by_user_name?: string | null;
  response_status?: string;
  responded_at?: string | null;
  responded_by_user_id?: string | null;
  responded_by_user_name?: string | null;
  assignment_scope?: string;
  broadcast_group_id?: string | null;
  extra_data?: Record<string, unknown>;
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

/** AI Lead Qualifier write-through metadata columns. All nullable — a lead
 * that hasn't been scored yet simply has nothing in these fields. */
export type LeadAIMetadata = {
  aiScore?: number | null;
  aiStatus?: "pending" | "chatting" | "qualified" | "disqualified" | "paused" | "error" | null;
  aiSessionId?: string | null;
  aiChamp?: Record<string, unknown> | null;
  aiReasoning?: Record<string, unknown> | null;
  aiScoreBreakdown?: Record<string, unknown> | null;
  aiLastScoredAt?: string | null;
  aiPath?: "fast" | "chat" | null;
};

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
} & LeadAIMetadata;

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
  comments: DealComment[];
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

export type DealComment = {
  id: string;
  dealId: string;
  body: string;
  authorUserId: string;
  authorUserName: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatus = "open" | "in_progress" | "done" | "canceled";
export type TaskResponseStatus = "pending" | "accepted" | "rejected";
export type TaskAssignmentScope = "individual" | "broadcast";

export type Task = {
  id: string;
  companyId: string;
  customerId: string;
  title: string;
  note: string;
  dueDate: string;
  status: TaskStatus;
  assigneeUserId: string;
  assigneeUserName: string;
  createdByUserId: string;
  createdByUserName: string;
  responseStatus: TaskResponseStatus;
  respondedAt: string;
  respondedByUserId: string;
  respondedByUserName: string;
  assignmentScope: TaskAssignmentScope;
  broadcastGroupId: string;
  extraData: Record<string, string>;
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

export type TaskFilters = {
  companyId?: string;
  customerId?: string;
  status?: string;
  responseStatus?: string;
  assigneeUserId?: string;
  createdByUserId?: string;
  assignmentScope?: string;
  broadcastGroupId?: string;
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

export type CreateDealCommentInput = {
  body: string;
};

export type UpsertTaskInput = {
  companyId: string;
  customerId?: string;
  title: string;
  note: string;
  dueDate?: string;
  status?: TaskStatus;
  assigneeUserId?: string;
  assigneeUserName?: string;
  responseStatus?: TaskResponseStatus;
  assignmentScope?: TaskAssignmentScope;
  broadcastGroupId?: string;
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
    aiScore: record.ai_score ?? null,
    aiStatus: (record.ai_status ?? null) as Lead["aiStatus"],
    aiSessionId: record.ai_session_id ?? null,
    aiChamp: record.ai_champ ?? null,
    aiReasoning: record.ai_reasoning ?? null,
    aiScoreBreakdown: record.ai_score_breakdown ?? null,
    aiLastScoredAt: record.ai_last_scored_at ?? null,
    aiPath: (record.ai_path ?? null) as Lead["aiPath"],
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
    comments: (record.comments ?? []).map((comment) => ({
      id: comment.id,
      dealId: comment.deal_id,
      body: comment.body?.trim() || "",
      authorUserId: comment.author_user_id?.trim() || "",
      authorUserName: comment.author_user_name?.trim() || "",
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
    })),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapTask(record: CRMTaskRecord): Task {
  return {
    id: record.id,
    companyId: record.company_id ?? "",
    customerId: record.customer_id ?? "",
    title: record.title?.trim() || "Untitled task",
    note: record.note?.trim() || "",
    dueDate: record.due_date ?? "",
    status: (record.status?.trim() || "open") as TaskStatus,
    assigneeUserId: record.assignee_user_id?.trim() || "",
    assigneeUserName: record.assignee_user_name?.trim() || "",
    createdByUserId: record.created_by_user_id?.trim() || "",
    createdByUserName: record.created_by_user_name?.trim() || "",
    responseStatus: (record.response_status?.trim() || "pending") as TaskResponseStatus,
    respondedAt: record.responded_at ?? "",
    respondedByUserId: record.responded_by_user_id?.trim() || "",
    respondedByUserName: record.responded_by_user_name?.trim() || "",
    assignmentScope:
      (record.assignment_scope?.trim() || "individual") as TaskAssignmentScope,
    broadcastGroupId: record.broadcast_group_id ?? "",
    extraData: normalizeExtraData(record.extra_data),
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

/** Fetch one lead by id. Returns null on 404 so callers can treat "deleted
 *  source lead" gracefully (e.g. deal detail showing AI insights). */
export async function getLead(leadId: string): Promise<Lead | null> {
  try {
    const record = await requestCRM<CRMLeadRecord>(`/leads/${leadId}`);
    return mapLead(record);
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
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

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const query = new URLSearchParams({
    limit: "100",
    offset: "0",
  });

  if (filters.companyId?.trim()) {
    query.set("company_id", filters.companyId.trim());
  }
  if (filters.customerId?.trim()) {
    query.set("customer_id", filters.customerId.trim());
  }
  if (filters.status?.trim()) {
    query.set("status", filters.status.trim());
  }
  if (filters.responseStatus?.trim()) {
    query.set("response_status", filters.responseStatus.trim());
  }
  if (filters.assigneeUserId?.trim()) {
    query.set("assignee_user_id", filters.assigneeUserId.trim());
  }
  if (filters.createdByUserId?.trim()) {
    query.set("created_by_user_id", filters.createdByUserId.trim());
  }
  if (filters.assignmentScope?.trim()) {
    query.set("assignment_scope", filters.assignmentScope.trim());
  }
  if (filters.broadcastGroupId?.trim()) {
    query.set("broadcast_group_id", filters.broadcastGroupId.trim());
  }
  if (filters.q?.trim()) {
    query.set("q", filters.q.trim());
  }

  const response = await requestCRM<CRMListResponse<CRMTaskRecord>>(
    `/tasks?${query.toString()}`,
  );
  return response.data.map(mapTask);
}

export async function createTask(input: UpsertTaskInput): Promise<Task> {
  const payload = await requestCRM<CRMTaskRecord>("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || undefined,
      title: input.title.trim(),
      note: input.note.trim(),
      due_date: input.dueDate?.trim() || undefined,
      status: input.status ?? "open",
      assignee_user_id: input.assigneeUserId?.trim() || "",
      assignee_user_name: input.assigneeUserName?.trim() || "",
      response_status: input.responseStatus ?? "pending",
      assignment_scope: input.assignmentScope ?? "individual",
      broadcast_group_id: input.broadcastGroupId?.trim() || undefined,
      extra_data: input.extraData ?? {},
    }),
  });

  return mapTask(payload);
}

export async function updateTask(taskId: string, input: Partial<UpsertTaskInput>): Promise<Task> {
  const payload = await requestCRM<CRMTaskRecord>(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.companyId !== undefined ? { company_id: input.companyId } : {}),
      ...(input.customerId !== undefined ? { customer_id: input.customerId.trim() || null } : {}),
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.note !== undefined ? { note: input.note.trim() } : {}),
      ...(input.dueDate !== undefined ? { due_date: input.dueDate.trim() || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assigneeUserId !== undefined
        ? { assignee_user_id: input.assigneeUserId.trim() }
        : {}),
      ...(input.assigneeUserName !== undefined
        ? { assignee_user_name: input.assigneeUserName.trim() }
        : {}),
      ...(input.responseStatus !== undefined
        ? { response_status: input.responseStatus }
        : {}),
      ...(input.assignmentScope !== undefined
        ? { assignment_scope: input.assignmentScope }
        : {}),
      ...(input.broadcastGroupId !== undefined
        ? { broadcast_group_id: input.broadcastGroupId.trim() || null }
        : {}),
      ...(input.extraData !== undefined ? { extra_data: input.extraData } : {}),
    }),
  });

  return mapTask(payload);
}

export async function deleteTask(taskId: string): Promise<void> {
  await requestCRM<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function createDealComment(
  dealId: string,
  input: CreateDealCommentInput,
): Promise<DealComment> {
  const payload = await requestCRM<CRMDealCommentRecord>(`/deals/${dealId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: input.body.trim(),
    }),
  });

  return {
    id: payload.id,
    dealId: payload.deal_id,
    body: payload.body?.trim() || "",
    authorUserId: payload.author_user_id?.trim() || "",
    authorUserName: payload.author_user_name?.trim() || "",
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
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
  webhook_url: string;
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
  /** Fully-qualified URL the operator pastes into Green API's console. */
  webhookUrl: string;
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
    webhookUrl: record.webhook_url,
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

export async function rotateGreenAPIWebhookToken(
  companyId: string,
): Promise<GreenAPIIntegration> {
  const record = await requestCRM<CRMGreenAPIRecord>(
    `/companies/${companyId}/integrations/greenapi/rotate-webhook-token`,
    { method: "POST" },
  );
  return mapGreenAPIIntegration(record);
}

// ─── AI Lead Qualifier Webhook Token + AI Config (Faz 5) ────────────────────

/**
 * AI config schema. All fields optional; the backend accepts unknown keys
 * but validates the listed ones strictly. Persist as-is through PATCH
 * /internal/company/:id/qualifier-config.
 */
export type QualifierAIConfig = {
  qualification_threshold?: number;
  handoff_aggressiveness?: "conservative" | "balanced" | "aggressive";
  language?: "tr" | "en";
  sector?: "construction" | "general";
  custom_prompt_prefix?: string;
  ideal_customer_profile?: string;
  forbidden_topics?: string[];
};

export type QualifierConfigResponse = {
  companyId: string;
  tokenPrimary: string | null;
  tokenSecondary: string | null;
  webhookUrl: string | null;
  fallbackUrl: string | null;
  aiConfig: QualifierAIConfig;
};

export type QualifierRotateResponse = {
  companyId: string;
  tokenPrimary: string;
  tokenSecondary: string | null;
  webhookUrl: string;
  rotationNotice: string;
};

type CRMQualifierConfig = {
  company_id: string;
  token_primary: string | null;
  token_secondary: string | null;
  webhook_url: string | null;
  fallback_url: string | null;
  ai_config: Record<string, unknown>;
  token?: string | null;
};

type CRMQualifierRotate = {
  company_id: string;
  token_primary: string;
  token_secondary: string | null;
  webhook_url: string;
  rotation_notice: string;
};

function mapQualifierConfig(r: CRMQualifierConfig): QualifierConfigResponse {
  return {
    companyId: r.company_id,
    tokenPrimary: r.token_primary ?? r.token ?? null,
    tokenSecondary: r.token_secondary ?? null,
    webhookUrl: r.webhook_url ?? null,
    fallbackUrl: r.fallback_url ?? null,
    aiConfig: (r.ai_config ?? {}) as QualifierAIConfig,
  };
}

export async function getQualifierConfig(
  companyId: string,
): Promise<QualifierConfigResponse | null> {
  try {
    const record = await requestCRM<CRMQualifierConfig>(
      `/companies/${companyId}/qualifier-config`,
    );
    return mapQualifierConfig(record);
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
}

export async function updateQualifierConfig(
  companyId: string,
  input: { fallbackUrl?: string; aiConfig?: QualifierAIConfig },
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (input.fallbackUrl !== undefined) body.fallback_url = input.fallbackUrl;
  if (input.aiConfig !== undefined) body.ai_config = input.aiConfig;
  await requestCRM<void>(`/companies/${companyId}/qualifier-config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function rotateQualifierToken(
  companyId: string,
): Promise<QualifierRotateResponse> {
  const record = await requestCRM<CRMQualifierRotate>(
    `/companies/${companyId}/qualifier-tokens/regenerate`,
    { method: "POST" },
  );
  return {
    companyId: record.company_id,
    tokenPrimary: record.token_primary,
    tokenSecondary: record.token_secondary ?? null,
    webhookUrl: record.webhook_url,
    rotationNotice: record.rotation_notice,
  };
}

export async function revokeQualifierSecondaryToken(companyId: string): Promise<void> {
  await requestCRM<void>(`/companies/${companyId}/qualifier-tokens/revoke`, {
    method: "POST",
  });
}

// Backwards-compatible aliases for the pre-Faz-5 callers in
// src/components/dashboard/companies/company-qualifier-panel.tsx. The
// Integrations Hub uses rotateQualifierToken + updateQualifierConfig
// directly; this shim keeps the legacy panel working until it is
// retired alongside the other legacy company-scoped panels.

export type QualifierTokenResponse = {
  companyId: string;
  token: string;
  webhookUrl: string;
};

export async function generateQualifierToken(
  companyId: string,
): Promise<QualifierTokenResponse> {
  const rotation = await rotateQualifierToken(companyId);
  return {
    companyId: rotation.companyId,
    token: rotation.tokenPrimary,
    webhookUrl: rotation.webhookUrl,
  };
}

export async function updateQualifierFallbackUrl(
  companyId: string,
  fallbackUrl: string,
): Promise<void> {
  await updateQualifierConfig(companyId, { fallbackUrl });
}

// ─── GreenAPI test connection (Faz 5) ───────────────────────────────────────

export type GreenAPITestResult = {
  ok: boolean;
  upstreamStatus: number;
  upstreamLatency: string;
  message: string;
};

export async function testGreenAPIConnection(
  companyId: string,
): Promise<GreenAPITestResult> {
  const record = await requestCRM<{
    ok: boolean;
    upstream_status: number;
    upstream_latency: string;
    message: string;
  }>(`/companies/${companyId}/integrations/greenapi/test`, { method: "POST" });
  return {
    ok: record.ok,
    upstreamStatus: record.upstream_status,
    upstreamLatency: record.upstream_latency,
    message: record.message,
  };
}

// ─── AI Lead Qualifier RAG Webhook (Faz 6) ──────────────────────────────────

export type QualifierRAGConfig = {
  companyId: string;
  tokenPrimary: string | null;
  tokenSecondary: string | null;
  webhookUrl: string | null;
};

export type QualifierRAGRotateResult = {
  companyId: string;
  tokenPrimary: string;
  tokenSecondary: string | null;
  webhookUrl: string;
  rotationNotice: string;
};

type CRMRAGConfig = {
  company_id: string;
  token_primary: string | null;
  token_secondary: string | null;
  webhook_url: string | null;
};

type CRMRAGRotate = {
  company_id: string;
  token_primary: string;
  token_secondary: string | null;
  webhook_url: string;
  rotation_notice: string;
};

export async function getQualifierRAGConfig(
  companyId: string,
): Promise<QualifierRAGConfig | null> {
  try {
    const r = await requestCRM<CRMRAGConfig>(
      `/companies/${companyId}/qualifier-rag-config`,
    );
    return {
      companyId: r.company_id,
      tokenPrimary: r.token_primary ?? null,
      tokenSecondary: r.token_secondary ?? null,
      webhookUrl: r.webhook_url ?? null,
    };
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
}

export async function rotateQualifierRAGToken(
  companyId: string,
): Promise<QualifierRAGRotateResult> {
  const r = await requestCRM<CRMRAGRotate>(
    `/companies/${companyId}/qualifier-rag-tokens/regenerate`,
    { method: "POST" },
  );
  return {
    companyId: r.company_id,
    tokenPrimary: r.token_primary,
    tokenSecondary: r.token_secondary ?? null,
    webhookUrl: r.webhook_url,
    rotationNotice: r.rotation_notice,
  };
}

export async function revokeQualifierRAGSecondaryToken(
  companyId: string,
): Promise<void> {
  await requestCRM<void>(`/companies/${companyId}/qualifier-rag-tokens/revoke`, {
    method: "POST",
  });
}

// ─── Intranet integration (Faz 7) ───────────────────────────────────────────

export type IntranetAuthMode = "hmac" | "bearer" | "hmac_or_bearer";

export type IntranetConfig = {
  id: string;
  companyId: string;
  inboundUrl: string;
  tokenPrimary: string;
  tokenSecondary: string | null;
  authMode: IntranetAuthMode;
  hmacSecretPrimaryMasked: string;
  hmacSecretSecondaryMasked: string | null;
  bearerTokenPrimaryMasked: string | null;
  bearerTokenSecondaryMasked: string | null;
  fieldMapping: Record<string, unknown>;
  targetEntity: "lead" | "customer";
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  deliveryCountTotal: number;
  deliveryCountSuccess: number;
  deliveryCountFailed: number;
  createdAt: string;
  updatedAt: string;
};

export type IntranetDelivery = {
  id: string;
  eventType: string | null;
  status: "accepted" | "rejected" | "failed";
  errorMessage?: string;
  mappedEntityId?: string;
  idempotencyKey?: string;
  latencyMs?: number;
  createdAt: string;
};

type CRMIntranetStatus = {
  id: string;
  company_id: string;
  inbound_url: string;
  token_primary: string;
  token_secondary?: string | null;
  auth_mode?: IntranetAuthMode;
  hmac_secret_primary_masked: string;
  hmac_secret_secondary_masked?: string | null;
  bearer_token_primary_masked?: string | null;
  bearer_token_secondary_masked?: string | null;
  field_mapping: Record<string, unknown>;
  target_entity: "lead" | "customer";
  is_active: boolean;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  delivery_count_total: number;
  delivery_count_success: number;
  delivery_count_failed: number;
  created_at: string;
  updated_at: string;
};

function mapIntranetStatus(r: CRMIntranetStatus): IntranetConfig {
  return {
    id: r.id,
    companyId: r.company_id,
    inboundUrl: r.inbound_url,
    tokenPrimary: r.token_primary,
    tokenSecondary: r.token_secondary ?? null,
    authMode: r.auth_mode ?? "hmac_or_bearer",
    hmacSecretPrimaryMasked: r.hmac_secret_primary_masked,
    hmacSecretSecondaryMasked: r.hmac_secret_secondary_masked ?? null,
    bearerTokenPrimaryMasked: r.bearer_token_primary_masked ?? null,
    bearerTokenSecondaryMasked: r.bearer_token_secondary_masked ?? null,
    fieldMapping: r.field_mapping,
    targetEntity: r.target_entity,
    isActive: r.is_active,
    lastDeliveryAt: r.last_delivery_at,
    lastDeliveryStatus: r.last_delivery_status,
    deliveryCountTotal: r.delivery_count_total,
    deliveryCountSuccess: r.delivery_count_success,
    deliveryCountFailed: r.delivery_count_failed,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getIntranetConfig(
  companyId: string,
): Promise<IntranetConfig | null> {
  try {
    const r = await requestCRM<CRMIntranetStatus>(
      `/companies/${companyId}/integrations/intranet`,
    );
    return mapIntranetStatus(r);
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
}

/** Creates the integration the first time; response includes the freshly-minted
 * HMAC secret plain text so the integrator can copy it once. Subsequent calls
 * (with the record already existing) update fieldMapping/targetEntity and omit
 * the secret. */
export async function upsertIntranetIntegration(
  companyId: string,
  input: {
    fieldMapping: Record<string, unknown>;
    targetEntity: "lead" | "customer";
    authMode?: IntranetAuthMode;
  },
): Promise<{
  integration: IntranetConfig;
  hmacSecretPlain?: string;
  bearerTokenPlain?: string;
}> {
  const payload: Record<string, unknown> = {
    field_mapping: input.fieldMapping,
    target_entity: input.targetEntity,
  };
  if (input.authMode) payload.auth_mode = input.authMode;
  const response = await requestCRM<
    | CRMIntranetStatus
    | {
        integration: CRMIntranetStatus;
        hmac_secret_plain: string;
        bearer_token_plain?: string;
      }
  >(`/companies/${companyId}/integrations/intranet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response && typeof response === "object" && "integration" in response) {
    return {
      integration: mapIntranetStatus(response.integration),
      hmacSecretPlain: response.hmac_secret_plain,
      bearerTokenPlain: response.bearer_token_plain,
    };
  }
  return { integration: mapIntranetStatus(response as CRMIntranetStatus) };
}

export async function patchIntranetIntegration(
  companyId: string,
  input: {
    fieldMapping?: Record<string, unknown>;
    targetEntity?: "lead" | "customer";
    authMode?: IntranetAuthMode;
  },
): Promise<IntranetConfig> {
  const body: Record<string, unknown> = {};
  if (input.fieldMapping !== undefined) body.field_mapping = input.fieldMapping;
  if (input.targetEntity !== undefined) body.target_entity = input.targetEntity;
  if (input.authMode !== undefined) body.auth_mode = input.authMode;
  const r = await requestCRM<CRMIntranetStatus>(
    `/companies/${companyId}/integrations/intranet`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return mapIntranetStatus(r);
}

export async function disconnectIntranetIntegration(companyId: string): Promise<void> {
  await requestCRM<void>(`/companies/${companyId}/integrations/intranet`, {
    method: "DELETE",
  });
}

export async function rotateIntranetToken(
  companyId: string,
): Promise<{ inboundUrl: string; tokenPrimary: string; tokenSecondary: string | null; rotationNotice: string }> {
  const r = await requestCRM<{
    inbound_url: string;
    token_primary: string;
    token_secondary: string | null;
    rotation_notice: string;
  }>(`/companies/${companyId}/integrations/intranet/rotate-token`, { method: "POST" });
  return {
    inboundUrl: r.inbound_url,
    tokenPrimary: r.token_primary,
    tokenSecondary: r.token_secondary,
    rotationNotice: r.rotation_notice,
  };
}

export async function revokeIntranetSecondaryToken(companyId: string): Promise<void> {
  await requestCRM<void>(
    `/companies/${companyId}/integrations/intranet/revoke-secondary-token`,
    { method: "POST" },
  );
}

export async function rotateIntranetSecret(
  companyId: string,
): Promise<{ hmacSecretPrimary: string; rotationNotice: string; secondaryMasked: string }> {
  const r = await requestCRM<{
    hmac_secret_primary: string;
    rotation_notice: string;
    secondary_masked: string;
  }>(`/companies/${companyId}/integrations/intranet/rotate-secret`, { method: "POST" });
  return {
    hmacSecretPrimary: r.hmac_secret_primary,
    rotationNotice: r.rotation_notice,
    secondaryMasked: r.secondary_masked,
  };
}

export async function revokeIntranetSecondarySecret(companyId: string): Promise<void> {
  await requestCRM<void>(
    `/companies/${companyId}/integrations/intranet/revoke-secondary-secret`,
    { method: "POST" },
  );
}

export async function rotateIntranetBearer(
  companyId: string,
): Promise<{ bearerTokenPrimary: string; rotationNotice: string; secondaryMasked: string }> {
  const r = await requestCRM<{
    bearer_token_primary: string;
    rotation_notice: string;
    secondary_masked: string;
  }>(`/companies/${companyId}/integrations/intranet/rotate-bearer`, { method: "POST" });
  return {
    bearerTokenPrimary: r.bearer_token_primary,
    rotationNotice: r.rotation_notice,
    secondaryMasked: r.secondary_masked,
  };
}

export async function revokeIntranetSecondaryBearer(companyId: string): Promise<void> {
  await requestCRM<void>(
    `/companies/${companyId}/integrations/intranet/revoke-secondary-bearer`,
    { method: "POST" },
  );
}

export async function listIntranetDeliveries(
  companyId: string,
): Promise<IntranetDelivery[]> {
  const rows = await requestCRM<
    {
      id: string;
      event_type: string | null;
      status: "accepted" | "rejected" | "failed";
      error_message?: string;
      mapped_entity_id?: string;
      idempotency_key?: string;
      latency_ms?: number;
      created_at: string;
    }[]
  >(`/companies/${companyId}/integrations/intranet/deliveries`);
  return rows.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    status: r.status,
    errorMessage: r.error_message,
    mappedEntityId: r.mapped_entity_id,
    idempotencyKey: r.idempotency_key,
    latencyMs: r.latency_ms,
    createdAt: r.created_at,
  }));
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

// ─── Integrations Hub ──────────────────────────────────────────────────────

export type IntegrationSlug =
  | "ai-lead-qualifier"
  | "greenapi"
  | "intranet"
  // Legacy deep-link slugs — the detail page resolves these to the
  // unified ai-lead-qualifier panel with the matching tab pre-selected.
  | "qualifier-lead-webhook"
  | "qualifier-rag-webhook"
  | "qualifier-fallback"
  | "qualifier-ai-config";

export type IntegrationStatus =
  | "not_configured"
  | "active"
  | "paused"
  | "error"
  | "coming_soon";

export type SubComponentSummary = {
  key: string;
  label: string;
  status: IntegrationStatus;
};

export type IntegrationSummary = {
  slug: IntegrationSlug;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  /** Explicit operator Connect/Disconnect state. When false, Leads + Deals
   *  UI hides ALL AI chips + insights even if the DB has metadata. */
  connected: boolean;
  last_connected_at?: string;
  masked_credentials?: string;
  requires_owner_role: boolean;
  sub_components?: SubComponentSummary[];
};

/** True iff the AI Lead Qualifier card is in "Connected" state. Treats a
 *  missing catalog entry as disconnected — safe default for gating UI. */
export function isAIQualifierConnected(catalog: IntegrationCatalog | null): boolean {
  if (!catalog) return false;
  const entry = catalog.available.find((a) => a.slug === "ai-lead-qualifier");
  return Boolean(entry?.connected);
}

export async function connectAIQualifier(companyId: string): Promise<void> {
  await requestCRM<unknown>(`/companies/${companyId}/qualifier-connect`, {
    method: "POST",
  });
}

export async function disconnectAIQualifier(companyId: string): Promise<void> {
  await requestCRM<unknown>(`/companies/${companyId}/qualifier-disconnect`, {
    method: "POST",
  });
}

export type IntegrationCatalog = {
  company_id: string;
  available: IntegrationSummary[];
  generated_at: string;
};

export async function fetchIntegrationCatalog(
  companyId: string,
): Promise<IntegrationCatalog> {
  return requestCRM<IntegrationCatalog>(
    `/companies/${companyId}/integrations`,
  );
}
