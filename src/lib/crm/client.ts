"use client";

type CRMListResponse<T> = {
  data: T[];
  limit: number;
  offset: number;
  // Total number of rows matching the query (ignoring limit/offset). Present
  // on endpoints that support server-side pagination (e.g. GET /leads).
  total?: number;
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
  next_follow_up_at?: string | null;
  archived_at?: string | null;
  archived_by_user_id?: string | null;
  archived_by_user_name?: string | null;
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

type CRMLeadCommentRecord = {
  id: string;
  lead_id: string;
  body: string;
  author_user_id?: string | null;
  author_user_name?: string | null;
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

type CRMCalendarEventRecord = {
  id: string;
  company_id?: string | null;
  customer_id?: string | null;
  title?: string;
  description?: string;
  event_type?: string;
  status?: string;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  assignee_user_id?: string | null;
  assignee_user_name?: string | null;
  linked_entity_type?: string;
  linked_entity_id?: string | null;
  location?: string;
  meeting_url?: string;
  reminder_minutes_before?: number | null;
  created_by_user_id?: string | null;
  created_by_user_name?: string | null;
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
  | "disqualified"
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
  nextFollowUpAt: string;
  archivedAt: string;
  archivedByUserId: string;
  archivedByUserName: string;
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

export type LeadComment = {
  id: string;
  leadId: string;
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

export type CalendarEventType =
  | "call"
  | "meeting"
  | "demo"
  | "follow_up"
  | "deadline";

export type CalendarEventStatus =
  | "scheduled"
  | "completed"
  | "canceled"
  | "missed";

export type CalendarLinkedEntityType = "" | "lead" | "deal" | "customer" | "company";

export type CalendarEvent = {
  id: string;
  companyId: string;
  customerId: string;
  title: string;
  description: string;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  startAt: string;
  endAt: string;
  allDay: boolean;
  assigneeUserId: string;
  assigneeUserName: string;
  linkedEntityType: CalendarLinkedEntityType;
  linkedEntityId: string;
  location: string;
  meetingUrl: string;
  reminderMinutesBefore: number | null;
  createdByUserId: string;
  createdByUserName: string;
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

export type CalendarEventFilters = {
  companyId?: string;
  customerId?: string;
  assigneeUserId?: string;
  eventType?: string;
  status?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  startFrom?: string;
  startTo?: string;
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
  nextFollowUpAt?: string;
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

export type CreateLeadCommentInput = {
  body: string;
};

export type UpdateLeadCommentInput = {
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

export type UpsertCalendarEventInput = {
  companyId: string;
  customerId?: string;
  title: string;
  description: string;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  startAt: string;
  endAt?: string;
  allDay: boolean;
  assigneeUserId?: string;
  assigneeUserName?: string;
  linkedEntityType?: CalendarLinkedEntityType;
  linkedEntityId?: string;
  location: string;
  meetingUrl: string;
  reminderMinutesBefore?: number | null;
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
      // Mailchimp surface (writeMailchimpError) returns both `error`
      // (Mailchimp's RFC7807 title — e.g. "Bad Request") and `detail`
      // (the actually useful sentence — e.g. "Title cannot be blank").
      // Prefer detail when present so operators see the diagnosis,
      // falling back to error otherwise.
      const body = (await response.json()) as { error?: string; detail?: string };
      const detail = typeof body.detail === "string" ? body.detail.trim() : "";
      const err = typeof body.error === "string" ? body.error.trim() : "";
      if (detail && err) {
        message = `${err}: ${detail}`;
      } else if (detail) {
        message = detail;
      } else if (err) {
        message = err;
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
    nextFollowUpAt: record.next_follow_up_at ?? "",
    archivedAt: record.archived_at ?? "",
    archivedByUserId: record.archived_by_user_id ?? "",
    archivedByUserName: record.archived_by_user_name ?? "",
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

function mapCalendarEvent(record: CRMCalendarEventRecord): CalendarEvent {
  return {
    id: record.id,
    companyId: record.company_id ?? "",
    customerId: record.customer_id ?? "",
    title: record.title?.trim() || "Untitled event",
    description: record.description?.trim() || "",
    eventType: (record.event_type?.trim() || "follow_up") as CalendarEventType,
    status: (record.status?.trim() || "scheduled") as CalendarEventStatus,
    startAt: record.start_at,
    endAt: record.end_at ?? "",
    allDay: Boolean(record.all_day),
    assigneeUserId: record.assignee_user_id?.trim() || "",
    assigneeUserName: record.assignee_user_name?.trim() || "",
    linkedEntityType:
      (record.linked_entity_type?.trim() || "") as CalendarLinkedEntityType,
    linkedEntityId: record.linked_entity_id ?? "",
    location: record.location?.trim() || "",
    meetingUrl: record.meeting_url?.trim() || "",
    reminderMinutesBefore:
      typeof record.reminder_minutes_before === "number"
        ? record.reminder_minutes_before
        : null,
    createdByUserId: record.created_by_user_id?.trim() || "",
    createdByUserName: record.created_by_user_name?.trim() || "",
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
  const limit = 100;
  let offset = 0;
  const records: CRMLeadRecord[] = [];

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
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
    records.push(...response.data);

    if (response.data.length < limit) {
      break;
    }

    offset += limit;
  }

  return records.map(mapLead);
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
  input: Partial<UpsertLeadInput>,
): Promise<Lead> {
  const payload = await requestCRM<CRMLeadRecord>(`/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.companyId !== undefined ? { company_id: input.companyId } : {}),
      ...(input.customerId !== undefined
        ? { customer_id: input.customerId.trim() || null }
        : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.source !== undefined ? { source: input.source.trim() } : {}),
      ...(input.assigneeUserId !== undefined
        ? { assignee_user_id: input.assigneeUserId.trim() }
        : {}),
      ...(input.assigneeUserName !== undefined
        ? { assignee_user_name: input.assigneeUserName.trim() }
        : {}),
      ...(input.assignmentMethod !== undefined
        ? { assignment_method: input.assignmentMethod }
        : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.extraData !== undefined ? { extra_data: input.extraData ?? {} } : {}),
      ...(input.nextFollowUpAt !== undefined
        ? { next_follow_up_at: input.nextFollowUpAt || null }
        : {}),
    }),
  });
  return mapLead(payload);
}

/** Archive a lead (replaces hard delete). Reversible by an admin. Returns
 *  the updated lead. Idempotent server-side. */
export async function archiveLead(leadId: string): Promise<Lead> {
  const payload = await requestCRM<CRMLeadRecord>(`/leads/${leadId}/archive`, {
    method: "POST",
  });
  return mapLead(payload);
}

/** Restore an archived lead. Admin-only (owner or super_admin, enforced in BFF). */
export async function unarchiveLead(leadId: string): Promise<Lead> {
  const payload = await requestCRM<CRMLeadRecord>(`/leads/${leadId}/unarchive`, {
    method: "POST",
  });
  return mapLead(payload);
}

type CRMAuditRecord = {
  id: string;
  company_id?: string | null;
  actor_type?: string;
  actor_user_id?: string;
  actor_user_name?: string;
  entity_type?: string;
  entity_id?: string | null;
  action?: string;
  payload?: Record<string, unknown> | null;
  request_id?: string;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  companyId: string;
  actorType: string;
  actorUserId: string;
  actorUserName: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  requestId: string;
  createdAt: string;
};

function mapAuditEvent(r: CRMAuditRecord): AuditEvent {
  return {
    id: r.id,
    companyId: r.company_id ?? "",
    actorType: r.actor_type ?? "",
    actorUserId: r.actor_user_id ?? "",
    actorUserName: r.actor_user_name ?? "",
    entityType: r.entity_type ?? "",
    entityId: r.entity_id ?? "",
    action: r.action ?? "",
    payload: (r.payload ?? {}) as Record<string, unknown>,
    requestId: r.request_id ?? "",
    createdAt: r.created_at,
  };
}

/** Per-lead audit timeline (newest first), paginated. */
export async function listLeadActivities(
  leadId: string,
  page: { limit: number; offset: number } = { limit: 30, offset: 0 },
): Promise<{ data: AuditEvent[]; total: number }> {
  const query = new URLSearchParams({ limit: String(page.limit), offset: String(page.offset) });
  const response = await requestCRM<CRMListResponse<CRMAuditRecord>>(
    `/leads/${leadId}/activities?${query.toString()}`,
  );
  return {
    data: response.data.map(mapAuditEvent),
    total: typeof response.total === "number" ? response.total : response.data.length,
  };
}

/** Company-wide audit log (admin). Server enforces owner/super_admin (403 on
 *  denial). Supports entity_type / entity_id / action / actor filters. */
export async function listCompanyAuditLog(
  companyId: string,
  page: { limit: number; offset: number } = { limit: 30, offset: 0 },
  filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorUserId?: string;
    actorType?: string;
  } = {},
): Promise<{ data: AuditEvent[]; total: number }> {
  const query = new URLSearchParams({ limit: String(page.limit), offset: String(page.offset) });
  if (filters.entityType?.trim()) query.set("entity_type", filters.entityType.trim());
  if (filters.entityId?.trim()) query.set("entity_id", filters.entityId.trim());
  if (filters.action?.trim()) query.set("action", filters.action.trim());
  if (filters.actorUserId?.trim()) query.set("actor_user_id", filters.actorUserId.trim());
  if (filters.actorType?.trim()) query.set("actor_type", filters.actorType.trim());
  const response = await requestCRM<CRMListResponse<CRMAuditRecord>>(
    `/companies/${companyId}/audit-log?${query.toString()}`,
  );
  return {
    data: response.data.map(mapAuditEvent),
    total: typeof response.total === "number" ? response.total : response.data.length,
  };
}

/** Fetch a SINGLE page of leads plus the total row count, for server-side
 *  pagination. Unlike listLeads (which walks every page), this returns just
 *  the requested window so large tables stay fast. */
export async function listLeadsPage(
  companyId: string,
  filters: LeadFilters = {},
  page: { limit: number; offset: number } = { limit: 25, offset: 0 },
): Promise<{ data: Lead[]; total: number }> {
  const query = new URLSearchParams({
    limit: String(page.limit),
    offset: String(page.offset),
    company_id: companyId,
  });
  if (filters.status?.trim()) query.set("status", filters.status.trim());
  if (filters.source?.trim()) query.set("source", filters.source.trim());
  if (filters.assigneeUserId?.trim())
    query.set("assignee_user_id", filters.assigneeUserId.trim());
  if (filters.q?.trim()) query.set("q", filters.q.trim());
  if (filters.unassigned) query.set("unassigned", "true");

  const response = await requestCRM<CRMListResponse<CRMLeadRecord>>(
    `/leads?${query.toString()}`,
  );
  return {
    data: response.data.map(mapLead),
    total: typeof response.total === "number" ? response.total : response.data.length,
  };
}

type CRMLeadStatsResponse = {
  total: number;
  unassigned: number;
  mine: number;
  by_status: Record<string, number>;
  sources: string[];
  cards: Record<string, { count: number; spark: number[]; trend: number | null }>;
};

export type LeadKpiCard = { count: number; spark: number[]; trend: number | null };

export type LeadStats = {
  total: number;
  unassigned: number;
  mine: number;
  byStatus: Record<string, number>;
  sources: string[];
  cards: Record<"total" | "qualified" | "contacted" | "converted", LeadKpiCard>;
};

/** Aggregate lead stats (counts + KPI sparkline/trend) computed server-side,
 *  so the directory never has to load every lead just to render tab badges
 *  and KPI cards. `meUserId` powers the "assigned to me" count. */
export async function getLeadStats(
  companyId: string,
  meUserId?: string,
): Promise<LeadStats> {
  const query = new URLSearchParams({ company_id: companyId });
  if (meUserId?.trim()) query.set("me", meUserId.trim());
  const r = await requestCRM<CRMLeadStatsResponse>(`/lead-stats?${query.toString()}`);
  const card = (k: string): LeadKpiCard => {
    const c = r.cards?.[k];
    return {
      count: c?.count ?? 0,
      spark: Array.isArray(c?.spark) ? c!.spark : [],
      trend: typeof c?.trend === "number" ? c!.trend : null,
    };
  };
  return {
    total: r.total ?? 0,
    unassigned: r.unassigned ?? 0,
    mine: r.mine ?? 0,
    byStatus: r.by_status ?? {},
    sources: Array.isArray(r.sources) ? r.sources : [],
    cards: {
      total: card("total"),
      qualified: card("qualified"),
      contacted: card("contacted"),
      converted: card("converted"),
    },
  };
}

/** Fetch a page of ARCHIVED leads (admin view). Server enforces the
 *  owner/leads.archive gate; a 403 surfaces as CRMClientError. */
export async function listArchivedLeads(
  companyId: string,
  page: { limit: number; offset: number } = { limit: 25, offset: 0 },
  filters: { q?: string } = {},
): Promise<{ data: Lead[]; total: number }> {
  const query = new URLSearchParams({
    archived: "true",
    limit: String(page.limit),
    offset: String(page.offset),
    company_id: companyId,
  });
  if (filters.q?.trim()) query.set("q", filters.q.trim());

  const response = await requestCRM<CRMListResponse<CRMLeadRecord>>(
    `/leads?${query.toString()}`,
  );
  return {
    data: response.data.map(mapLead),
    total: typeof response.total === "number" ? response.total : response.data.length,
  };
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

export async function listCalendarEvents(
  filters: CalendarEventFilters = {},
): Promise<CalendarEvent[]> {
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
  if (filters.assigneeUserId?.trim()) {
    query.set("assignee_user_id", filters.assigneeUserId.trim());
  }
  if (filters.eventType?.trim()) {
    query.set("event_type", filters.eventType.trim());
  }
  if (filters.status?.trim()) {
    query.set("status", filters.status.trim());
  }
  if (filters.linkedEntityType?.trim()) {
    query.set("linked_entity_type", filters.linkedEntityType.trim());
  }
  if (filters.linkedEntityId?.trim()) {
    query.set("linked_entity_id", filters.linkedEntityId.trim());
  }
  if (filters.startFrom?.trim()) {
    query.set("start_from", filters.startFrom.trim());
  }
  if (filters.startTo?.trim()) {
    query.set("start_to", filters.startTo.trim());
  }
  if (filters.q?.trim()) {
    query.set("q", filters.q.trim());
  }

  const response = await requestCRM<CRMListResponse<CRMCalendarEventRecord>>(
    `/calendar-events?${query.toString()}`,
  );
  return response.data.map(mapCalendarEvent);
}

export async function createCalendarEvent(
  input: UpsertCalendarEventInput,
): Promise<CalendarEvent> {
  const payload = await requestCRM<CRMCalendarEventRecord>("/calendar-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || undefined,
      title: input.title.trim(),
      description: input.description.trim(),
      event_type: input.eventType,
      status: input.status,
      start_at: input.startAt,
      end_at: input.endAt?.trim() || undefined,
      all_day: input.allDay,
      assignee_user_id: input.assigneeUserId?.trim() || "",
      assignee_user_name: input.assigneeUserName?.trim() || "",
      linked_entity_type: input.linkedEntityType?.trim() || "",
      linked_entity_id: input.linkedEntityId?.trim() || undefined,
      location: input.location.trim(),
      meeting_url: input.meetingUrl.trim(),
      reminder_minutes_before: input.reminderMinutesBefore ?? undefined,
      extra_data: input.extraData ?? {},
    }),
  });

  return mapCalendarEvent(payload);
}

export async function updateCalendarEvent(
  eventId: string,
  input: UpsertCalendarEventInput,
): Promise<CalendarEvent> {
  const payload = await requestCRM<CRMCalendarEventRecord>(`/calendar-events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: input.companyId,
      customer_id: input.customerId?.trim() || null,
      title: input.title.trim(),
      description: input.description.trim(),
      event_type: input.eventType,
      status: input.status,
      start_at: input.startAt,
      end_at: input.endAt?.trim() || null,
      all_day: input.allDay,
      assignee_user_id: input.assigneeUserId?.trim() || "",
      assignee_user_name: input.assigneeUserName?.trim() || "",
      linked_entity_type: input.linkedEntityType?.trim() || "",
      linked_entity_id: input.linkedEntityId?.trim() || null,
      location: input.location.trim(),
      meeting_url: input.meetingUrl.trim(),
      reminder_minutes_before: input.reminderMinutesBefore ?? null,
      extra_data: input.extraData ?? {},
    }),
  });

  return mapCalendarEvent(payload);
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await requestCRM<void>(`/calendar-events/${eventId}`, {
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

export async function listLeadComments(leadId: string): Promise<LeadComment[]> {
  const response = await requestCRM<CRMListResponse<CRMLeadCommentRecord>>(
    `/leads/${leadId}/comments`,
  );

  return response.data.map((comment) => ({
    id: comment.id,
    leadId: comment.lead_id,
    body: comment.body?.trim() || "",
    authorUserId: comment.author_user_id?.trim() || "",
    authorUserName: comment.author_user_name?.trim() || "",
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  }));
}

export async function createLeadComment(
  leadId: string,
  input: CreateLeadCommentInput,
): Promise<LeadComment> {
  const payload = await requestCRM<CRMLeadCommentRecord>(`/leads/${leadId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: input.body.trim(),
    }),
  });

  return {
    id: payload.id,
    leadId: payload.lead_id,
    body: payload.body?.trim() || "",
    authorUserId: payload.author_user_id?.trim() || "",
    authorUserName: payload.author_user_name?.trim() || "",
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

export async function updateLeadComment(
  leadId: string,
  commentId: string,
  input: UpdateLeadCommentInput,
): Promise<LeadComment> {
  const payload = await requestCRM<CRMLeadCommentRecord>(
    `/leads/${leadId}/comments/${commentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: input.body.trim(),
      }),
    },
  );

  return {
    id: payload.id,
    leadId: payload.lead_id,
    body: payload.body?.trim() || "",
    authorUserId: payload.author_user_id?.trim() || "",
    authorUserName: payload.author_user_name?.trim() || "",
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

export async function deleteLeadComment(leadId: string, commentId: string): Promise<void> {
  await requestCRM<void>(`/leads/${leadId}/comments/${commentId}`, {
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
  manual_qualify?: boolean;
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

// ─── Intranet outbound webhook (CRM → customer status push) ─────────────────

export type IntranetOutboundStatus =
  | "*"
  | "new"
  | "contacted"
  | "qualified"
  | "lost"
  | "converted";

export type IntranetOutboundConfig = {
  url: string | null;
  hasSecret: boolean;
  secretRotatedAt: string | null;
  enabledStatuses: IntranetOutboundStatus[];
  paused: boolean;
};

export type IntranetOutboundDelivery = {
  id: string;
  eventId: string;
  eventType: string;
  toStatus: string;
  fromStatus: string | null;
  externalId: string | null;
  status: "pending" | "success" | "failed" | "dead";
  attemptCount: number;
  lastError: string | null;
  lastResponseStatus: number | null;
  nextRetryAt: string | null;
  occurredAt: string;
  createdAt: string;
};

type CRMOutboundConfigRaw = {
  url: string | null;
  has_secret: boolean;
  secret_rotated_at?: string | null;
  enabled_statuses: IntranetOutboundStatus[];
  paused: boolean;
};

function mapOutboundConfig(r: CRMOutboundConfigRaw): IntranetOutboundConfig {
  return {
    url: r.url,
    hasSecret: r.has_secret,
    secretRotatedAt: r.secret_rotated_at ?? null,
    enabledStatuses: r.enabled_statuses,
    paused: r.paused,
  };
}

export async function getIntranetOutboundConfig(
  companyId: string,
): Promise<IntranetOutboundConfig> {
  const r = await requestCRM<CRMOutboundConfigRaw>(
    `/companies/${companyId}/integrations/intranet/outbound`,
  );
  return mapOutboundConfig(r);
}

export async function updateIntranetOutboundConfig(
  companyId: string,
  patch: {
    url?: string | null;
    enabledStatuses?: IntranetOutboundStatus[];
    paused?: boolean;
    rotateSecret?: boolean;
  },
): Promise<{ config: IntranetOutboundConfig; secretPlaintext?: string }> {
  const body: Record<string, unknown> = {};
  if (patch.url !== undefined) body.url = patch.url ?? "";
  if (patch.enabledStatuses !== undefined) body.enabled_statuses = patch.enabledStatuses;
  if (patch.paused !== undefined) body.paused = patch.paused;
  if (patch.rotateSecret) body.rotate_secret = true;

  const response = await requestCRM<{
    config: CRMOutboundConfigRaw;
    secret_plaintext?: string;
  }>(`/companies/${companyId}/integrations/intranet/outbound`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    config: mapOutboundConfig(response.config),
    secretPlaintext: response.secret_plaintext,
  };
}

export async function testIntranetOutboundWebhook(
  companyId: string,
  toStatus: IntranetOutboundStatus,
): Promise<{ enqueued: boolean; eventId: string }> {
  const r = await requestCRM<{ enqueued: boolean; event_id: string }>(
    `/companies/${companyId}/integrations/intranet/outbound/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_status: toStatus }),
    },
  );
  return { enqueued: r.enqueued, eventId: r.event_id };
}

export async function listIntranetOutboundDeliveries(
  companyId: string,
  limit: number = 20,
): Promise<IntranetOutboundDelivery[]> {
  const rows = await requestCRM<
    {
      id: string;
      event_id: string;
      event_type: string;
      to_status: string;
      from_status?: string;
      external_id?: string;
      status: "pending" | "success" | "failed" | "dead";
      attempt_count: number;
      last_error?: string;
      last_response_status?: number;
      next_retry_at?: string;
      occurred_at: string;
      created_at: string;
    }[]
  >(`/companies/${companyId}/integrations/intranet/outbound/deliveries?limit=${limit}`);
  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    eventType: r.event_type,
    toStatus: r.to_status,
    fromStatus: r.from_status ?? null,
    externalId: r.external_id ?? null,
    status: r.status,
    attemptCount: r.attempt_count,
    lastError: r.last_error ?? null,
    lastResponseStatus: r.last_response_status ?? null,
    nextRetryAt: r.next_retry_at ?? null,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  }));
}

// ─── Meta Lead Ads integration ──────────────────────────────────────────────

export type MetaConfig = {
  id: string;
  companyId: string;
  inboundUrl: string;
  n8nWebhookUrl: string;
  tokenPrimary: string;
  tokenSecondary: string | null;
  appIdMasked: string | null;
  appSecretMasked: string | null;
  pageAccessTokenMasked: string | null;
  hmacSecretPrimaryMasked: string;
  hmacSecretSecondaryMasked: string | null;
  webhookVerifyToken: string;
  metaPageId: string | null;
  metaPageName: string | null;
  metaFormIds: string[];
  fieldMapping: Record<string, string>;
  mockMode: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  deliveryCountTotal: number;
  deliveryCountSuccess: number;
  deliveryCountFailed: number;
  oauthUserId: string | null;
  oauthUserName: string | null;
  subscribedAt: string | null;
  subscribedFields: string[];
  createdAt: string;
  updatedAt: string;
};

export type MetaPage = {
  id: string;
  name: string;
  category?: string;
  picture_url?: string;
  followers_count?: number;
  last_lead_at?: string | null;
  last_7d_leads: number;
  is_connected: boolean;
};

export type MetaForm = {
  id: string;
  name: string;
  status?: string;
  leads_count?: number;
  last_7d_leads: number;
  is_subscribed: boolean;
};

export type MetaDelivery = {
  id: string;
  eventType: string | null;
  leadgenId: string | null;
  pageId: string | null;
  formId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  adId: string | null;
  adName: string | null;
  status: "accepted" | "rejected" | "failed";
  errorMessage: string | null;
  mappedEntityId: string | null;
  idempotencyKey: string | null;
  latencyMs: number | null;
  createdAt: string;
};

type CRMMetaStatus = {
  id: string;
  company_id: string;
  inbound_url: string;
  n8n_webhook_url: string;
  token_primary: string;
  token_secondary: string | null;
  app_id_masked: string | null;
  app_secret_masked: string | null;
  page_access_token_masked: string | null;
  hmac_secret_primary_masked: string;
  hmac_secret_secondary_masked: string | null;
  webhook_verify_token: string;
  meta_page_id: string | null;
  meta_page_name: string | null;
  meta_form_ids: string[];
  field_mapping: Record<string, string>;
  mock_mode: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  delivery_count_total: number;
  delivery_count_success: number;
  delivery_count_failed: number;
  oauth_user_id: string | null;
  oauth_user_name: string | null;
  subscribed_at: string | null;
  subscribed_fields: string[];
  created_at: string;
  updated_at: string;
};

function mapMetaStatus(r: CRMMetaStatus): MetaConfig {
  return {
    id: r.id,
    companyId: r.company_id,
    inboundUrl: r.inbound_url,
    n8nWebhookUrl: r.n8n_webhook_url,
    tokenPrimary: r.token_primary,
    tokenSecondary: r.token_secondary,
    appIdMasked: r.app_id_masked,
    appSecretMasked: r.app_secret_masked,
    pageAccessTokenMasked: r.page_access_token_masked,
    hmacSecretPrimaryMasked: r.hmac_secret_primary_masked,
    hmacSecretSecondaryMasked: r.hmac_secret_secondary_masked,
    webhookVerifyToken: r.webhook_verify_token,
    metaPageId: r.meta_page_id,
    metaPageName: r.meta_page_name,
    metaFormIds: r.meta_form_ids ?? [],
    fieldMapping: r.field_mapping ?? {},
    mockMode: r.mock_mode,
    isActive: r.is_active,
    lastSyncAt: r.last_sync_at,
    lastDeliveryAt: r.last_delivery_at,
    lastDeliveryStatus: r.last_delivery_status,
    deliveryCountTotal: r.delivery_count_total,
    deliveryCountSuccess: r.delivery_count_success,
    deliveryCountFailed: r.delivery_count_failed,
    oauthUserId: r.oauth_user_id,
    oauthUserName: r.oauth_user_name,
    subscribedAt: r.subscribed_at,
    subscribedFields: r.subscribed_fields ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getMetaConfig(companyId: string): Promise<MetaConfig | null> {
  try {
    const r = await requestCRM<CRMMetaStatus>(`/companies/${companyId}/meta-config`);
    return mapMetaStatus(r);
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
}

export type MetaConnectInput = {
  appId?: string;
  appSecret?: string;
  pageAccessToken?: string;
  pageId?: string;
  pageName?: string;
  formIds?: string[];
  fieldMapping?: Record<string, string>;
  mockMode: boolean;
};

/** First-time connect mints + reveals the plain HMAC secret and verify token.
 * Subsequent connects (record already exists) return only the verify token —
 * rotate explicitly to surface a new HMAC secret. */
export async function connectMetaIntegration(
  companyId: string,
  input: MetaConnectInput,
): Promise<{
  integration: MetaConfig;
  hmacSecretPlain?: string;
  webhookVerifyToken: string;
}> {
  const body: Record<string, unknown> = {
    mock_mode: input.mockMode,
  };
  if (input.appId !== undefined) body.app_id = input.appId;
  if (input.appSecret !== undefined) body.app_secret = input.appSecret;
  if (input.pageAccessToken !== undefined) body.page_access_token = input.pageAccessToken;
  if (input.pageId !== undefined) body.page_id = input.pageId;
  if (input.pageName !== undefined) body.page_name = input.pageName;
  if (input.formIds !== undefined) body.form_ids = input.formIds;
  if (input.fieldMapping !== undefined) body.field_mapping = input.fieldMapping;

  const response = await requestCRM<{
    integration: CRMMetaStatus;
    hmac_secret_plain?: string;
    webhook_verify_token: string;
  }>(`/companies/${companyId}/meta-connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    integration: mapMetaStatus(response.integration),
    hmacSecretPlain: response.hmac_secret_plain,
    webhookVerifyToken: response.webhook_verify_token,
  };
}

export async function disconnectMetaIntegration(companyId: string): Promise<void> {
  await requestCRM<void>(`/companies/${companyId}/meta-disconnect`, { method: "POST" });
}

export type MetaUpdateInput = {
  formIds?: string[];
  fieldMapping?: Record<string, string>;
  mockMode?: boolean;
  isActive?: boolean;
  pageId?: string;
  pageName?: string;
  appId?: string;
  appSecret?: string;
  pageAccessToken?: string;
};

export async function updateMetaConfig(
  companyId: string,
  input: MetaUpdateInput,
): Promise<MetaConfig> {
  const body: Record<string, unknown> = {};
  if (input.formIds !== undefined) body.form_ids = input.formIds;
  if (input.fieldMapping !== undefined) body.field_mapping = input.fieldMapping;
  if (input.mockMode !== undefined) body.mock_mode = input.mockMode;
  if (input.isActive !== undefined) body.is_active = input.isActive;
  if (input.pageId !== undefined) body.page_id = input.pageId;
  if (input.pageName !== undefined) body.page_name = input.pageName;
  if (input.appId !== undefined) body.app_id = input.appId;
  if (input.appSecret !== undefined) body.app_secret = input.appSecret;
  if (input.pageAccessToken !== undefined) body.page_access_token = input.pageAccessToken;

  const r = await requestCRM<CRMMetaStatus>(`/companies/${companyId}/meta-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return mapMetaStatus(r);
}

export async function sendMetaTestLead(
  companyId: string,
  input: { name?: string; email?: string; phone?: string; formId?: string } = {},
): Promise<{ leadId: string; leadgenId: string }> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.email !== undefined) body.email = input.email;
  if (input.phone !== undefined) body.phone = input.phone;
  if (input.formId !== undefined) body.form_id = input.formId;
  const r = await requestCRM<{ lead_id: string; leadgen_id: string }>(
    `/companies/${companyId}/meta-test-lead`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return { leadId: r.lead_id, leadgenId: r.leadgen_id };
}

export async function listMetaDeliveries(companyId: string): Promise<MetaDelivery[]> {
  const rows = await requestCRM<
    {
      id: string;
      event_type: string | null;
      leadgen_id: string | null;
      page_id: string | null;
      form_id: string | null;
      campaign_id: string | null;
      campaign_name: string | null;
      ad_id: string | null;
      ad_name: string | null;
      status: "accepted" | "rejected" | "failed";
      error_message: string | null;
      mapped_entity_id: string | null;
      idempotency_key: string | null;
      latency_ms: number | null;
      created_at: string;
    }[]
  >(`/companies/${companyId}/meta-deliveries`);
  return rows.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    leadgenId: r.leadgen_id,
    pageId: r.page_id,
    formId: r.form_id,
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    adId: r.ad_id,
    adName: r.ad_name,
    status: r.status,
    errorMessage: r.error_message,
    mappedEntityId: r.mapped_entity_id,
    idempotencyKey: r.idempotency_key,
    latencyMs: r.latency_ms,
    createdAt: r.created_at,
  }));
}

export async function rotateMetaToken(
  companyId: string,
): Promise<{ inboundUrl: string; tokenPrimary: string; tokenSecondary: string | null; rotationNotice: string }> {
  const r = await requestCRM<{
    inbound_url: string;
    token_primary: string;
    token_secondary: string | null;
    rotation_notice: string;
  }>(`/companies/${companyId}/meta-rotate-token`, { method: "POST" });
  return {
    inboundUrl: r.inbound_url,
    tokenPrimary: r.token_primary,
    tokenSecondary: r.token_secondary,
    rotationNotice: r.rotation_notice,
  };
}

export async function rotateMetaSecret(
  companyId: string,
): Promise<{ hmacSecretPrimary: string; rotationNotice: string; secondaryMasked: string }> {
  const r = await requestCRM<{
    hmac_secret_primary: string;
    rotation_notice: string;
    secondary_masked: string;
  }>(`/companies/${companyId}/meta-rotate-secret`, { method: "POST" });
  return {
    hmacSecretPrimary: r.hmac_secret_primary,
    rotationNotice: r.rotation_notice,
    secondaryMasked: r.secondary_masked,
  };
}

// ─── Meta OAuth via Nango (Phase 2.1) ──────────────────────────────────────

/** NangoUnavailable signals the backend's 503 — Nango self-hosted env
 *  vars (NANGO_HOST / NANGO_SECRET_KEY) aren't set on the CRM service.
 *  UI uses this to render "ask the admin to wire up Nango, or use
 *  mock mode" hint. */
export class MetaOAuthNotConfiguredError extends Error {
  constructor() {
    super("Meta OAuth (Nango) is not yet configured.");
    this.name = "MetaOAuthNotConfiguredError";
  }
}

function isNangoUnavailable(err: unknown): boolean {
  return err instanceof CRMClientError && err.status === 503;
}

/** getMetaConnectSession — Nango v0.40+ requires a short-lived session
 *  token (issued backend-side using the secret key) before the frontend
 *  SDK can open the Connect popup. The legacy publicKey flow is gone.
 *  We pass the workspace UUID as both end_user.id and the eventual
 *  connection_id. */
export async function getMetaConnectSession(
  companyId: string,
  providerConfigKey = "facebook",
): Promise<{ sessionToken: string; connectionId: string; providerConfigKey: string }> {
  try {
    const r = await requestCRM<{
      session_token: string;
      connection_id: string;
      provider_config_key: string;
    }>(`/companies/${companyId}/meta-connect-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_config_key: providerConfigKey }),
    });
    return {
      sessionToken: r.session_token,
      connectionId: r.connection_id,
      providerConfigKey: r.provider_config_key,
    };
  } catch (err) {
    if (isNangoUnavailable(err)) throw new MetaOAuthNotConfiguredError();
    throw err;
  }
}

/** completeMetaOAuth — frontend already has the Nango popup outcome
 *  (connectionId from `connectMetaViaNango` in src/lib/nango/client.ts),
 *  this BFF round-trip persists it on the CRM side and returns the FB
 *  Pages list so the page-picker UI can render. Body shape mirrors the
 *  backend's NangoConnectRequest. */
export async function completeMetaOAuth(
  companyId: string,
  payload: { connectionId: string; providerConfigKey: string },
): Promise<{ oauthUserId: string; oauthUserName: string; pages: MetaPage[] }> {
  try {
    const r = await requestCRM<{
      oauth_user_id: string;
      oauth_user_name: string;
      pages: MetaPage[];
    }>(`/companies/${companyId}/meta-connect-nango`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connection_id: payload.connectionId,
        provider_config_key: payload.providerConfigKey,
      }),
    });
    return {
      oauthUserId: r.oauth_user_id,
      oauthUserName: r.oauth_user_name,
      pages: r.pages,
    };
  } catch (err) {
    if (isNangoUnavailable(err)) throw new MetaOAuthNotConfiguredError();
    throw err;
  }
}

export async function listMetaPages(companyId: string): Promise<MetaPage[]> {
  const r = await requestCRM<{ pages: MetaPage[] }>(
    `/companies/${companyId}/meta-pages`,
  );
  return r.pages ?? [];
}

export async function listMetaForms(
  companyId: string,
  pageId: string,
): Promise<MetaForm[]> {
  const q = new URLSearchParams({ page_id: pageId });
  const r = await requestCRM<{ forms: MetaForm[] }>(
    `/companies/${companyId}/meta-forms?${q.toString()}`,
  );
  return r.forms ?? [];
}

export async function finalizeMetaConfig(
  companyId: string,
  input: { pageId: string; formIds: string[]; fieldMapping?: Record<string, string> },
): Promise<MetaConfig> {
  const r = await requestCRM<CRMMetaStatus>(`/companies/${companyId}/meta-finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page_id: input.pageId,
      form_ids: input.formIds,
      field_mapping: input.fieldMapping,
    }),
  });
  return mapMetaStatus(r);
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
  | "meta-lead-ads"
  | "google-sheets"
  | "mailchimp"
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

// ─────────────────────────────────────────────────────────────────────────────
// Google Sheets integration (G1: OAuth + manual sync, read-only).
// Mirrors the Meta surface — Nango-mediated OAuth, plus per-sheet config rows
// and a manual "Sync now" trigger.
// ─────────────────────────────────────────────────────────────────────────────

export class SheetsOAuthNotConfiguredError extends Error {
  constructor() {
    super("Google Sheets OAuth (Nango) is not yet configured.");
    this.name = "SheetsOAuthNotConfiguredError";
  }
}

export type GoogleIntegration = {
  id: string;
  company_id: string;
  nango_connection_id: string;
  nango_provider_config_key: string;
  oauth_user_email?: string;
  oauth_user_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SheetImport = {
  id: string;
  company_id: string;
  google_integration_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  sheet_gid?: number | null;
  campaign_label: string;
  header_row_number: number;
  data_start_row: number;
  field_mapping: Record<string, string>;
  default_source: string;
  is_active: boolean;
  last_synced_at?: string | null;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
  last_sync_added: number;
  last_sync_updated: number;
  total_synced: number;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

export type SheetsStatus = {
  integration?: GoogleIntegration;
  sheet_imports: SheetImport[];
  nango_ready: boolean;
};

export type SpreadsheetInfo = {
  id: string;
  name: string;
  modified_time?: string;
  web_view_link?: string;
};

export type SheetTabInfo = {
  title: string;
  gid: number;
  row_count: number;
  column_count: number;
  is_hidden?: boolean;
};

export type SheetPreview = {
  headers: string[];
  sample_rows: Array<Record<string, string>>;
};

export type SheetSyncResult = {
  import_id: string;
  status: "ok" | "error";
  added: number;
  updated: number;
  total_rows: number;
  error_message?: string;
  started_at: string;
  completed_at: string;
};

/** getSheetsConnectSession — backend mints the Nango Connect Session token
 *  needed to open the OAuth popup (Nango v0.40+ requires it). */
export async function getSheetsConnectSession(
  companyId: string,
  providerConfigKey = "google-sheet",
): Promise<{ sessionToken: string; connectionId: string; providerConfigKey: string }> {
  try {
    const r = await requestCRM<{
      session_token: string;
      connection_id: string;
      provider_config_key: string;
    }>(`/companies/${companyId}/sheets-connect-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_config_key: providerConfigKey }),
    });
    return {
      sessionToken: r.session_token,
      connectionId: r.connection_id,
      providerConfigKey: r.provider_config_key,
    };
  } catch (err) {
    if (isNangoUnavailable(err)) throw new SheetsOAuthNotConfiguredError();
    throw err;
  }
}

/** completeSheetsOAuth — persists the Nango popup outcome on the CRM side
 *  and returns the connected Google account's user info for the badge. */
export async function completeSheetsOAuth(
  companyId: string,
  payload: { connectionId: string; providerConfigKey: string },
): Promise<{ oauthUserEmail: string; oauthUserName: string; isActive: boolean }> {
  try {
    const r = await requestCRM<{
      oauth_user_email: string;
      oauth_user_name: string;
      is_active: boolean;
    }>(`/companies/${companyId}/sheets-connect-nango`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connection_id: payload.connectionId,
        provider_config_key: payload.providerConfigKey,
      }),
    });
    return {
      oauthUserEmail: r.oauth_user_email,
      oauthUserName: r.oauth_user_name,
      isActive: r.is_active,
    };
  } catch (err) {
    if (isNangoUnavailable(err)) throw new SheetsOAuthNotConfiguredError();
    throw err;
  }
}

export async function fetchSheetsStatus(companyId: string): Promise<SheetsStatus> {
  return requestCRM<SheetsStatus>(`/companies/${companyId}/sheets-status`);
}

export async function listSpreadsheets(companyId: string): Promise<SpreadsheetInfo[]> {
  const r = await requestCRM<{ spreadsheets: SpreadsheetInfo[] }>(
    `/companies/${companyId}/sheets-spreadsheets`,
  );
  return r.spreadsheets ?? [];
}

export async function listSheetTabs(
  companyId: string,
  spreadsheetId: string,
): Promise<SheetTabInfo[]> {
  const r = await requestCRM<{ tabs: SheetTabInfo[] }>(
    `/companies/${companyId}/sheets-spreadsheets/${encodeURIComponent(spreadsheetId)}/tabs`,
  );
  return r.tabs ?? [];
}

export async function previewSheet(
  companyId: string,
  payload: {
    spreadsheetId: string;
    sheetName: string;
    headerRowNumber?: number;
    sampleRowCount?: number;
  },
): Promise<SheetPreview> {
  return requestCRM<SheetPreview>(`/companies/${companyId}/sheets-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spreadsheet_id: payload.spreadsheetId,
      sheet_name: payload.sheetName,
      header_row_number: payload.headerRowNumber ?? 1,
      sample_row_count: payload.sampleRowCount ?? 5,
    }),
  });
}

export async function createSheetImport(
  companyId: string,
  payload: {
    spreadsheetId: string;
    spreadsheetName: string;
    sheetName: string;
    sheetGid?: number;
    campaignLabel: string;
    headerRowNumber: number;
    dataStartRow: number;
    fieldMapping: Record<string, string>;
  },
): Promise<SheetImport> {
  return requestCRM<SheetImport>(`/companies/${companyId}/sheet-imports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spreadsheet_id: payload.spreadsheetId,
      spreadsheet_name: payload.spreadsheetName,
      sheet_name: payload.sheetName,
      sheet_gid: payload.sheetGid,
      campaign_label: payload.campaignLabel,
      header_row_number: payload.headerRowNumber,
      data_start_row: payload.dataStartRow,
      field_mapping: payload.fieldMapping,
    }),
  });
}

export async function updateSheetImport(
  companyId: string,
  importId: string,
  payload: {
    campaignLabel?: string;
    headerRowNumber?: number;
    dataStartRow?: number;
    fieldMapping?: Record<string, string>;
    isActive?: boolean;
  },
): Promise<SheetImport> {
  return requestCRM<SheetImport>(
    `/companies/${companyId}/sheet-imports/${encodeURIComponent(importId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_label: payload.campaignLabel,
        header_row_number: payload.headerRowNumber,
        data_start_row: payload.dataStartRow,
        field_mapping: payload.fieldMapping,
        is_active: payload.isActive,
      }),
    },
  );
}

export async function deleteSheetImport(
  companyId: string,
  importId: string,
): Promise<void> {
  await requestCRM<unknown>(
    `/companies/${companyId}/sheet-imports/${encodeURIComponent(importId)}`,
    { method: "DELETE" },
  );
}

export async function syncSheetImportNow(
  companyId: string,
  importId: string,
): Promise<SheetSyncResult> {
  return requestCRM<SheetSyncResult>(
    `/companies/${companyId}/sheet-imports/${encodeURIComponent(importId)}/sync`,
    { method: "POST" },
  );
}

export async function disconnectSheets(companyId: string): Promise<void> {
  await requestCRM<unknown>(`/companies/${companyId}/sheets-disconnect`, {
    method: "POST",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mailchimp integration (per-USER — diverges from Meta/Sheets which are
// per-company). Every operator connects their own Mailchimp account; the
// BFF forwards company_id as a query param so the Go backend can scope
// the integration row on (company_id, user_id).
//
// Endpoint pathing:
//   /users/me/mailchimp-{connect-session,connect-complete,config,disconnect}
//   /users/me/mailchimp/{audiences,campaigns,templates,reports,...}
//   /companies/:id/mailchimp-connections (owner roster)
//
// Response payloads from Mailchimp are forwarded as raw JSON. We provide
// loose TypeScript shapes (Record<string, unknown> with named optional
// fields the UI reads) rather than fully typing 60+ Mailchimp fields per
// resource — the consumer narrows what it needs at call sites.
// ─────────────────────────────────────────────────────────────────────────────

export type MailchimpConfig = {
  id: string;
  userId: string;
  companyId: string;
  dc: string;
  accountId?: string;
  accountName?: string;
  accountEmail?: string;
  loginUrl?: string;
  totalSubscribers?: number;
  isActive: boolean;
  lastPushAt?: string;
  lastPushStatus?: string;
  pushCountTotal: number;
  pushCountSuccess: number;
  pushCountFailed: number;
  createdAt: string;
  updatedAt: string;
};

type CRMMailchimpStatus = {
  id: string;
  user_id: string;
  company_id: string;
  dc: string;
  account_id?: string;
  account_name?: string;
  account_email?: string;
  login_url?: string;
  total_subscribers?: number;
  is_active: boolean;
  last_push_at?: string;
  last_push_status?: string;
  push_count_total: number;
  push_count_success: number;
  push_count_failed: number;
  created_at: string;
  updated_at: string;
};

function mapMailchimpStatus(r: CRMMailchimpStatus): MailchimpConfig {
  return {
    id: r.id,
    userId: r.user_id,
    companyId: r.company_id,
    dc: r.dc,
    accountId: r.account_id,
    accountName: r.account_name,
    accountEmail: r.account_email,
    loginUrl: r.login_url,
    totalSubscribers: r.total_subscribers,
    isActive: r.is_active,
    lastPushAt: r.last_push_at,
    lastPushStatus: r.last_push_status,
    pushCountTotal: r.push_count_total,
    pushCountSuccess: r.push_count_success,
    pushCountFailed: r.push_count_failed,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type MailchimpOwnerConnection = {
  userId: string;
  accountName?: string;
  accountEmail?: string;
  loginUrl?: string;
  totalSubscribers?: number;
  isActive: boolean;
  lastPushAt?: string;
  connectedAt: string;
};

/** Raw Mailchimp resource shapes — loose by design. The fields enumerated
 *  here are the ones the UI components currently read; extra Mailchimp
 *  fields are preserved in the `[key: string]: unknown` bag for future use. */
export type MailchimpAudience = {
  id: string;
  name: string;
  stats?: {
    member_count?: number;
    unsubscribe_count?: number;
    cleaned_count?: number;
    open_rate?: number;
    click_rate?: number;
  };
  date_created?: string;
  list_rating?: number;
  contact?: { company?: string; country?: string };
  [key: string]: unknown;
};

export type MailchimpMember = {
  id: string;
  email_address: string;
  status: string; // subscribed | unsubscribed | cleaned | pending | transactional | archived
  merge_fields?: Record<string, unknown>;
  tags?: Array<{ id: number; name: string }>;
  last_changed?: string;
  [key: string]: unknown;
};

export type MailchimpCampaign = {
  id: string;
  type: string;
  status: string; // save | paused | schedule | sending | sent
  create_time?: string;
  send_time?: string;
  emails_sent?: number;
  settings?: {
    subject_line?: string;
    title?: string;
    from_name?: string;
    reply_to?: string;
    template_id?: number;
  };
  recipients?: { list_id?: string; list_name?: string; recipient_count?: number };
  [key: string]: unknown;
};

export type MailchimpTemplate = {
  id: number;
  name: string;
  type: string; // user | base | gallery
  category?: string;
  date_created?: string;
  active?: boolean;
  thumbnail?: string;
  [key: string]: unknown;
};

export type MailchimpReport = {
  id: string;
  campaign_title?: string;
  type?: string;
  list_id?: string;
  list_name?: string;
  subject_line?: string;
  emails_sent?: number;
  send_time?: string;
  opens?: {
    opens_total?: number;
    unique_opens?: number;
    open_rate?: number;
    last_open?: string;
  };
  clicks?: {
    clicks_total?: number;
    unique_clicks?: number;
    click_rate?: number;
    last_click?: string;
  };
  bounces?: {
    hard_bounces?: number;
    soft_bounces?: number;
    syntax_errors?: number;
  };
  forwards?: { forwards_count?: number; forwards_opens?: number };
  [key: string]: unknown;
};

/** Push-leads request + per-row response. Mirrors the backend's
 *  pushLeadsRequest / pushLeadsResponse shape (push_leads_handler.go). */
export type PushLeadsRequest = {
  leadIds: string[];
  updateExisting?: boolean;
  extraTags?: string[];
  defaultStatus?: string;
};

export type PushLeadResult = {
  leadId: string;
  email?: string;
  status: "created" | "updated" | "skipped" | "error";
  reason?: string;
};

export type PushLeadsResponse = {
  audienceId: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  totalRequested: number;
  results: PushLeadResult[];
  completedAt: string;
};

/** MailchimpNotConfiguredError mirrors MetaOAuthNotConfiguredError —
 *  rendered as a "tell the admin to wire NANGO_SECRET_KEY" hint. */
export class MailchimpNotConfiguredError extends Error {
  constructor() {
    super("Mailchimp OAuth (Nango) is not yet configured.");
    this.name = "MailchimpNotConfiguredError";
  }
}

/** Helper: append company_id to a path (or return path as-is if already
 *  has a query string with company_id). Every /users/me/mailchimp* call
 *  uses this so the BFF can resolve X-Company-Id. */
function withCompany(path: string, companyId: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}company_id=${encodeURIComponent(companyId)}`;
}

// ── Connection lifecycle ─────────────────────────────────────────────────

export async function getMailchimpConnectSession(
  companyId: string,
  endUserEmail?: string,
): Promise<{ sessionToken: string; connectionId: string; providerConfigKey: string }> {
  try {
    const r = await requestCRM<{
      session_token: string;
      connection_id: string;
      provider_config_key: string;
    }>(withCompany("/users/me/mailchimp-connect-session", companyId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_user_email: endUserEmail ?? "" }),
    });
    return {
      sessionToken: r.session_token,
      connectionId: r.connection_id,
      providerConfigKey: r.provider_config_key,
    };
  } catch (err) {
    if (isNangoUnavailable(err)) throw new MailchimpNotConfiguredError();
    throw err;
  }
}

export async function completeMailchimpConnect(
  companyId: string,
  payload: { connectionId: string; providerConfigKey?: string },
): Promise<MailchimpConfig> {
  try {
    const r = await requestCRM<CRMMailchimpStatus>(
      withCompany("/users/me/mailchimp-connect-complete", companyId),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_id: payload.connectionId,
          provider_config_key: payload.providerConfigKey ?? "mailchimp",
        }),
      },
    );
    return mapMailchimpStatus(r);
  } catch (err) {
    if (isNangoUnavailable(err)) throw new MailchimpNotConfiguredError();
    throw err;
  }
}

/** getMailchimpConfig returns the operator's own row (no connection_id
 *  in the response — masked server-side). Resolves to null on 404 so the
 *  caller can render the "not connected" empty state. */
export async function getMailchimpConfig(companyId: string): Promise<MailchimpConfig | null> {
  try {
    const r = await requestCRM<CRMMailchimpStatus>(
      withCompany("/users/me/mailchimp-config", companyId),
    );
    return mapMailchimpStatus(r);
  } catch (err) {
    if (err instanceof CRMClientError && err.status === 404) return null;
    throw err;
  }
}

export async function disconnectMailchimp(companyId: string): Promise<void> {
  await requestCRM<unknown>(withCompany("/users/me/mailchimp-disconnect", companyId), {
    method: "POST",
  });
}

// ── Owner roster ─────────────────────────────────────────────────────────

export async function listMailchimpConnections(
  companyId: string,
): Promise<MailchimpOwnerConnection[]> {
  const r = await requestCRM<{
    company_id: string;
    connections: Array<{
      user_id: string;
      account_name?: string;
      account_email?: string;
      login_url?: string;
      total_subscribers?: number;
      is_active: boolean;
      last_push_at?: string;
      connected_at: string;
    }>;
  }>(`/companies/${encodeURIComponent(companyId)}/mailchimp-connections`);
  return (r.connections ?? []).map((c) => ({
    userId: c.user_id,
    accountName: c.account_name,
    accountEmail: c.account_email,
    loginUrl: c.login_url,
    totalSubscribers: c.total_subscribers,
    isActive: c.is_active,
    lastPushAt: c.last_push_at,
    connectedAt: c.connected_at,
  }));
}

export async function forceDisconnectMailchimpUser(
  companyId: string,
  userId: string,
): Promise<void> {
  await requestCRM<unknown>(
    `/companies/${encodeURIComponent(companyId)}/mailchimp-connections/${encodeURIComponent(userId)}/disconnect`,
    { method: "POST" },
  );
}

// ── Account / Ping ───────────────────────────────────────────────────────

export async function pingMailchimp(companyId: string): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    withCompany("/users/me/mailchimp/ping", companyId),
  );
}

export async function getMailchimpAccount(
  companyId: string,
): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    withCompany("/users/me/mailchimp/account", companyId),
  );
}

// ── Audiences (lists) ────────────────────────────────────────────────────

export type AudienceListQuery = {
  count?: number;
  offset?: number;
  email?: string;
};

function appendQuery(path: string, params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const q = usp.toString();
  if (!q) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${q}`;
}

export async function listMailchimpAudiences(
  companyId: string,
  query: AudienceListQuery = {},
): Promise<{ lists: MailchimpAudience[]; total_items: number }> {
  return requestCRM<{ lists: MailchimpAudience[]; total_items: number }>(
    appendQuery(withCompany("/users/me/mailchimp/audiences", companyId), query),
  );
}

export async function getMailchimpAudience(
  companyId: string,
  listId: string,
): Promise<MailchimpAudience> {
  return requestCRM<MailchimpAudience>(
    withCompany(`/users/me/mailchimp/audiences/${encodeURIComponent(listId)}`, companyId),
  );
}

export async function createMailchimpAudience(
  companyId: string,
  payload: Record<string, unknown>,
): Promise<MailchimpAudience> {
  return requestCRM<MailchimpAudience>(
    withCompany("/users/me/mailchimp/audiences", companyId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateMailchimpAudience(
  companyId: string,
  listId: string,
  payload: Record<string, unknown>,
): Promise<MailchimpAudience> {
  return requestCRM<MailchimpAudience>(
    withCompany(`/users/me/mailchimp/audiences/${encodeURIComponent(listId)}`, companyId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpAudience(
  companyId: string,
  listId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(`/users/me/mailchimp/audiences/${encodeURIComponent(listId)}`, companyId),
    { method: "DELETE" },
  );
}

// ── Members ──────────────────────────────────────────────────────────────

export type MemberListQuery = {
  count?: number;
  offset?: number;
  status?: string;
};

export async function listMailchimpAudienceMembers(
  companyId: string,
  listId: string,
  query: MemberListQuery = {},
): Promise<{ members: MailchimpMember[]; total_items: number }> {
  return requestCRM<{ members: MailchimpMember[]; total_items: number }>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/members`,
        companyId,
      ),
      query,
    ),
  );
}

export async function upsertMailchimpMember(
  companyId: string,
  listId: string,
  email: string,
  payload: Record<string, unknown>,
): Promise<MailchimpMember> {
  return requestCRM<MailchimpMember>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/members/${encodeURIComponent(email)}`,
      companyId,
    ),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, email_address: payload.email_address ?? email }),
    },
  );
}

/** Result envelope from Mailchimp's batch upsert. Kept loose because
 *  the new_members / updated_members / errors arrays each carry the full
 *  Mailchimp member shape (60+ fields) we'd otherwise have to type out;
 *  the CSV upload UI only reads the counts and the top-level arrays
 *  length. */
export type BatchUpsertMembersResult = {
  new_members?: unknown[];
  updated_members?: unknown[];
  errors?: Array<{
    email_address?: string;
    error?: string;
    error_code?: string;
  }>;
  total_created?: number;
  total_updated?: number;
  error_count?: number;
};

/** batchUpsertMailchimpMembers wraps the composite endpoint with the
 *  same shape Mailchimp's /3.0/lists/{id} POST returns. Each call is
 *  capped at 500 members upstream; the CSV upload modal chunks before
 *  calling so it can stream progress to the operator. */
export async function batchUpsertMailchimpMembers(
  companyId: string,
  listId: string,
  payload: { members: Array<Record<string, unknown>>; update_existing?: boolean },
): Promise<BatchUpsertMembersResult> {
  return requestCRM<BatchUpsertMembersResult>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/members:batch`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function archiveMailchimpMember(
  companyId: string,
  listId: string,
  email: string,
  permanent = false,
): Promise<void> {
  const path = withCompany(
    `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/members/${encodeURIComponent(email)}`,
    companyId,
  );
  const url = permanent ? `${path}&permanent=true` : path;
  await requestCRM<unknown>(url, { method: "DELETE" });
}

export async function tagMailchimpMember(
  companyId: string,
  listId: string,
  email: string,
  tags: Array<{ name: string; status: "active" | "inactive" }>,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/members/${encodeURIComponent(email)}/tags`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    },
  );
}

export async function pushCRMLeadsToMailchimpAudience(
  companyId: string,
  listId: string,
  request: PushLeadsRequest,
): Promise<PushLeadsResponse> {
  type RawResult = {
    audience_id: string;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    total_requested: number;
    results: Array<{
      lead_id: string;
      email?: string;
      status: PushLeadResult["status"];
      reason?: string;
    }>;
    completed_at: string;
  };
  const r = await requestCRM<RawResult>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/push-leads`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_ids: request.leadIds,
        update_existing: request.updateExisting,
        extra_tags: request.extraTags,
        default_status: request.defaultStatus,
      }),
    },
  );
  return {
    audienceId: r.audience_id,
    created: r.created,
    updated: r.updated,
    skipped: r.skipped,
    errors: r.errors,
    totalRequested: r.total_requested,
    results: r.results.map((row) => ({
      leadId: row.lead_id,
      email: row.email,
      status: row.status,
      reason: row.reason,
    })),
    completedAt: r.completed_at,
  };
}

// ── Campaigns ────────────────────────────────────────────────────────────

export type CampaignListQuery = {
  count?: number;
  offset?: number;
  type?: string;
  status?: string;
  list_id?: string;
  sort_field?: string;
  sort_dir?: "ASC" | "DESC";
};

export async function listMailchimpCampaigns(
  companyId: string,
  query: CampaignListQuery = {},
): Promise<{ campaigns: MailchimpCampaign[]; total_items: number }> {
  return requestCRM<{ campaigns: MailchimpCampaign[]; total_items: number }>(
    appendQuery(withCompany("/users/me/mailchimp/campaigns", companyId), query),
  );
}

export async function getMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<MailchimpCampaign> {
  return requestCRM<MailchimpCampaign>(
    withCompany(`/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}`, companyId),
  );
}

export async function createMailchimpCampaign(
  companyId: string,
  payload: Record<string, unknown>,
): Promise<MailchimpCampaign> {
  return requestCRM<MailchimpCampaign>(
    withCompany("/users/me/mailchimp/campaigns", companyId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateMailchimpCampaign(
  companyId: string,
  campaignId: string,
  payload: Record<string, unknown>,
): Promise<MailchimpCampaign> {
  return requestCRM<MailchimpCampaign>(
    withCompany(`/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}`, companyId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function setMailchimpCampaignContent(
  companyId: string,
  campaignId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/content`,
      companyId,
    ),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function scheduleMailchimpCampaign(
  companyId: string,
  campaignId: string,
  payload: { schedule_time: string; timewarp?: boolean },
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/schedule`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function unscheduleMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/unschedule`,
      companyId,
    ),
    { method: "POST" },
  );
}

export async function sendMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/send`,
      companyId,
    ),
    { method: "POST" },
  );
}

export async function sendMailchimpTestCampaign(
  companyId: string,
  campaignId: string,
  testEmails: string[],
  sendType: "html" | "plaintext" = "html",
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/test`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_emails: testEmails, send_type: sendType }),
    },
  );
}

export async function pauseMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/pause`,
      companyId,
    ),
    { method: "POST" },
  );
}

export async function resumeMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/resume`,
      companyId,
    ),
    { method: "POST" },
  );
}

export async function replicateMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<MailchimpCampaign> {
  return requestCRM<MailchimpCampaign>(
    withCompany(
      `/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}/replicate`,
      companyId,
    ),
    { method: "POST" },
  );
}

export async function deleteMailchimpCampaign(
  companyId: string,
  campaignId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(`/users/me/mailchimp/campaigns/${encodeURIComponent(campaignId)}`, companyId),
    { method: "DELETE" },
  );
}

// ── Templates ────────────────────────────────────────────────────────────

export type TemplateListQuery = {
  count?: number;
  offset?: number;
  type?: "user" | "base" | "gallery";
  category?: string;
};

export async function listMailchimpTemplates(
  companyId: string,
  query: TemplateListQuery = {},
): Promise<{ templates: MailchimpTemplate[]; total_items: number }> {
  return requestCRM<{ templates: MailchimpTemplate[]; total_items: number }>(
    appendQuery(withCompany("/users/me/mailchimp/templates", companyId), query),
  );
}

export async function getMailchimpTemplate(
  companyId: string,
  templateId: string | number,
): Promise<MailchimpTemplate> {
  return requestCRM<MailchimpTemplate>(
    withCompany(
      `/users/me/mailchimp/templates/${encodeURIComponent(String(templateId))}`,
      companyId,
    ),
  );
}

export async function createMailchimpTemplate(
  companyId: string,
  payload: { name: string; html?: string; folder_id?: string },
): Promise<MailchimpTemplate> {
  return requestCRM<MailchimpTemplate>(
    withCompany("/users/me/mailchimp/templates", companyId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateMailchimpTemplate(
  companyId: string,
  templateId: string | number,
  payload: { name?: string; html?: string; folder_id?: string },
): Promise<MailchimpTemplate> {
  return requestCRM<MailchimpTemplate>(
    withCompany(
      `/users/me/mailchimp/templates/${encodeURIComponent(String(templateId))}`,
      companyId,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpTemplate(
  companyId: string,
  templateId: string | number,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/templates/${encodeURIComponent(String(templateId))}`,
      companyId,
    ),
    { method: "DELETE" },
  );
}

// ── Reports ──────────────────────────────────────────────────────────────

export type ReportListQuery = { count?: number; offset?: number; type?: string };

export async function listMailchimpReports(
  companyId: string,
  query: ReportListQuery = {},
): Promise<{ reports: MailchimpReport[]; total_items: number }> {
  return requestCRM<{ reports: MailchimpReport[]; total_items: number }>(
    appendQuery(withCompany("/users/me/mailchimp/reports", companyId), query),
  );
}

export async function getMailchimpCampaignReport(
  companyId: string,
  campaignId: string,
): Promise<MailchimpReport> {
  return requestCRM<MailchimpReport>(
    withCompany(`/users/me/mailchimp/reports/${encodeURIComponent(campaignId)}`, companyId),
  );
}

export async function listMailchimpCampaignOpens(
  companyId: string,
  campaignId: string,
  query: { count?: number; offset?: number } = {},
): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/reports/${encodeURIComponent(campaignId)}/opens`,
        companyId,
      ),
      query,
    ),
  );
}

export async function listMailchimpCampaignClicks(
  companyId: string,
  campaignId: string,
  query: { count?: number; offset?: number } = {},
): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/reports/${encodeURIComponent(campaignId)}/clicks`,
        companyId,
      ),
      query,
    ),
  );
}

export async function getMailchimpCampaignLocations(
  companyId: string,
  campaignId: string,
): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    withCompany(
      `/users/me/mailchimp/reports/${encodeURIComponent(campaignId)}/locations`,
      companyId,
    ),
  );
}

export async function getMailchimpCampaignEmailActivity(
  companyId: string,
  campaignId: string,
  query: { count?: number; offset?: number } = {},
): Promise<Record<string, unknown>> {
  return requestCRM<Record<string, unknown>>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/reports/${encodeURIComponent(campaignId)}/email-activity`,
        companyId,
      ),
      query,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mailchimp — advanced surfaces: Segments, audience-level Tags,
// Automations / Customer Journeys (trigger only), Webhooks. The
// underlying Go handlers live in internal/mailchimp/advanced_handler.go.
// ─────────────────────────────────────────────────────────────────────────────

export type MailchimpSegment = {
  id: number;
  name: string;
  type: string; // saved | static | fuzzy
  member_count?: number;
  created_at?: string;
  updated_at?: string;
  options?: Record<string, unknown>;
  [key: string]: unknown;
};

export type SegmentListQuery = {
  count?: number;
  offset?: number;
  type?: "saved" | "static" | "fuzzy";
};

export async function listMailchimpSegments(
  companyId: string,
  listId: string,
  query: SegmentListQuery = {},
): Promise<{ segments: MailchimpSegment[]; total_items: number }> {
  return requestCRM<{ segments: MailchimpSegment[]; total_items: number }>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/segments`,
        companyId,
      ),
      query,
    ),
  );
}

export async function getMailchimpSegment(
  companyId: string,
  listId: string,
  segmentId: string | number,
): Promise<MailchimpSegment> {
  return requestCRM<MailchimpSegment>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/segments/${encodeURIComponent(String(segmentId))}`,
      companyId,
    ),
  );
}

export async function createMailchimpSegment(
  companyId: string,
  listId: string,
  payload: { name: string; static_segment?: string[]; options?: Record<string, unknown> },
): Promise<MailchimpSegment> {
  return requestCRM<MailchimpSegment>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/segments`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateMailchimpSegment(
  companyId: string,
  listId: string,
  segmentId: string | number,
  payload: Record<string, unknown>,
): Promise<MailchimpSegment> {
  return requestCRM<MailchimpSegment>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/segments/${encodeURIComponent(String(segmentId))}`,
      companyId,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpSegment(
  companyId: string,
  listId: string,
  segmentId: string | number,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/segments/${encodeURIComponent(String(segmentId))}`,
      companyId,
    ),
    { method: "DELETE" },
  );
}

export async function listMailchimpSegmentMembers(
  companyId: string,
  listId: string,
  segmentId: string | number,
  query: { count?: number; offset?: number } = {},
): Promise<{ members: MailchimpMember[]; total_items: number }> {
  return requestCRM<{ members: MailchimpMember[]; total_items: number }>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/segments/${encodeURIComponent(String(segmentId))}/members`,
        companyId,
      ),
      query,
    ),
  );
}

// ── Audience-level Tag inventory ───────────────────────────────────────

export type MailchimpAudienceTag = {
  id: number;
  name: string;
  member_count?: number;
  [key: string]: unknown;
};

export async function listMailchimpAudienceTags(
  companyId: string,
  listId: string,
  query: { name?: string } = {},
): Promise<{ tags: MailchimpAudienceTag[]; total_items: number }> {
  return requestCRM<{ tags: MailchimpAudienceTag[]; total_items: number }>(
    appendQuery(
      withCompany(
        `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/tags`,
        companyId,
      ),
      query,
    ),
  );
}

// ── Automations / Customer Journeys ────────────────────────────────────

export type MailchimpAutomation = {
  id: string;
  status: string; // save | paused | sending | sent
  emails_sent?: number;
  start_time?: string;
  recipients?: { list_id?: string; list_name?: string };
  settings?: { title?: string; from_name?: string; reply_to?: string };
  [key: string]: unknown;
};

export async function listMailchimpAutomations(
  companyId: string,
): Promise<{ automations: MailchimpAutomation[]; total_items: number }> {
  return requestCRM<{ automations: MailchimpAutomation[]; total_items: number }>(
    withCompany(`/users/me/mailchimp/automations`, companyId),
  );
}

export async function getMailchimpAutomation(
  companyId: string,
  workflowId: string,
): Promise<MailchimpAutomation> {
  return requestCRM<MailchimpAutomation>(
    withCompany(
      `/users/me/mailchimp/automations/${encodeURIComponent(workflowId)}`,
      companyId,
    ),
  );
}

export async function pauseAllMailchimpAutomation(
  companyId: string,
  workflowId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/automations/${encodeURIComponent(workflowId)}/pause-all`,
      companyId,
    ),
    { method: "POST" },
  );
}

export async function startAllMailchimpAutomation(
  companyId: string,
  workflowId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/automations/${encodeURIComponent(workflowId)}/start-all`,
      companyId,
    ),
    { method: "POST" },
  );
}

// ── Webhooks (per audience) ────────────────────────────────────────────

export type MailchimpWebhook = {
  id: string;
  url: string;
  events?: Record<string, boolean>;
  sources?: Record<string, boolean>;
  list_id?: string;
  [key: string]: unknown;
};

export async function listMailchimpAudienceWebhooks(
  companyId: string,
  listId: string,
): Promise<{ webhooks: MailchimpWebhook[]; total_items: number }> {
  return requestCRM<{ webhooks: MailchimpWebhook[]; total_items: number }>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/webhooks`,
      companyId,
    ),
  );
}

export async function createMailchimpAudienceWebhook(
  companyId: string,
  listId: string,
  payload: {
    url: string;
    events?: Partial<{
      subscribe: boolean;
      unsubscribe: boolean;
      profile: boolean;
      cleaned: boolean;
      upemail: boolean;
      campaign: boolean;
    }>;
    sources?: Partial<{ user: boolean; admin: boolean; api: boolean }>;
  },
): Promise<MailchimpWebhook> {
  return requestCRM<MailchimpWebhook>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/webhooks`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpAudienceWebhook(
  companyId: string,
  listId: string,
  webhookId: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/webhooks/${encodeURIComponent(webhookId)}`,
      companyId,
    ),
    { method: "DELETE" },
  );
}

// ─── Mailchimp File Manager ──────────────────────────────────────────────

export type MailchimpFile = {
  id: number;
  name: string;
  type: string; // image | file
  size?: number;
  full_size_url?: string;
  thumbnail_url?: string;
  folder_id?: number;
  created_at?: string;
  created_by?: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
};

export type FileListQuery = {
  count?: number;
  offset?: number;
  type?: "image" | "file";
  sort_field?: "added_date";
  sort_dir?: "ASC" | "DESC";
};

export async function listMailchimpFiles(
  companyId: string,
  query: FileListQuery = {},
): Promise<{ files: MailchimpFile[]; total_file_size?: number; total_items: number }> {
  return requestCRM<{
    files: MailchimpFile[];
    total_file_size?: number;
    total_items: number;
  }>(appendQuery(withCompany("/users/me/mailchimp/files", companyId), query));
}

export async function uploadMailchimpFile(
  companyId: string,
  payload: { name: string; file_data: string; folder_id?: number },
): Promise<MailchimpFile> {
  return requestCRM<MailchimpFile>(
    withCompany("/users/me/mailchimp/files", companyId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpFile(
  companyId: string,
  fileId: number | string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/files/${encodeURIComponent(String(fileId))}`,
      companyId,
    ),
    { method: "DELETE" },
  );
}

// ─── Mailchimp Merge Fields (custom audience columns) ────────────────────

export type MailchimpMergeField = {
  merge_id: number;
  tag: string; // e.g. FNAME, COMPANY
  name: string; // human label
  type: string; // text | number | address | phone | date | url | imageurl | radio | dropdown | birthday | zip
  required?: boolean;
  default_value?: string;
  public?: boolean;
  display_order?: number;
  options?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function listMailchimpMergeFields(
  companyId: string,
  listId: string,
): Promise<{ merge_fields: MailchimpMergeField[]; total_items: number }> {
  return requestCRM<{ merge_fields: MailchimpMergeField[]; total_items: number }>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/merge-fields`,
      companyId,
    ),
  );
}

export async function createMailchimpMergeField(
  companyId: string,
  listId: string,
  payload: {
    tag: string;
    name: string;
    type: string;
    required?: boolean;
    default_value?: string;
    public?: boolean;
    options?: Record<string, unknown>;
  },
): Promise<MailchimpMergeField> {
  return requestCRM<MailchimpMergeField>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/merge-fields`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function updateMailchimpMergeField(
  companyId: string,
  listId: string,
  mergeId: string | number,
  payload: Record<string, unknown>,
): Promise<MailchimpMergeField> {
  return requestCRM<MailchimpMergeField>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/merge-fields/${encodeURIComponent(String(mergeId))}`,
      companyId,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpMergeField(
  companyId: string,
  listId: string,
  mergeId: string | number,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/audiences/${encodeURIComponent(listId)}/merge-fields/${encodeURIComponent(String(mergeId))}`,
      companyId,
    ),
    { method: "DELETE" },
  );
}

// ─── Mailchimp Verified Domains ──────────────────────────────────────────

export type MailchimpVerifiedDomain = {
  domain: string;
  verified: boolean;
  authenticated: boolean;
  verification_email?: string;
  verification_sent?: string;
  [key: string]: unknown;
};

export async function listMailchimpVerifiedDomains(
  companyId: string,
): Promise<{ domains: MailchimpVerifiedDomain[]; total_items: number }> {
  return requestCRM<{ domains: MailchimpVerifiedDomain[]; total_items: number }>(
    withCompany("/users/me/mailchimp/verified-domains", companyId),
  );
}

export async function addMailchimpVerifiedDomain(
  companyId: string,
  payload: { verification_email: string },
): Promise<MailchimpVerifiedDomain> {
  return requestCRM<MailchimpVerifiedDomain>(
    withCompany("/users/me/mailchimp/verified-domains", companyId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function verifyMailchimpDomain(
  companyId: string,
  domain: string,
  payload: { code: string },
): Promise<MailchimpVerifiedDomain> {
  return requestCRM<MailchimpVerifiedDomain>(
    withCompany(
      `/users/me/mailchimp/verified-domains/${encodeURIComponent(domain)}/verify`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMailchimpVerifiedDomain(
  companyId: string,
  domain: string,
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/verified-domains/${encodeURIComponent(domain)}`,
      companyId,
    ),
    { method: "DELETE" },
  );
}

// ─── Mailchimp Search ────────────────────────────────────────────────────

export type SearchMembersResult = {
  exact_matches?: { members?: MailchimpMember[]; total_items?: number };
  full_search?: { members?: MailchimpMember[]; total_items?: number };
};

export async function searchMailchimpMembers(
  companyId: string,
  query: string,
  listId?: string,
): Promise<SearchMembersResult> {
  const usp = new URLSearchParams({ query });
  if (listId) usp.set("list_id", listId);
  return requestCRM<SearchMembersResult>(
    `${withCompany("/users/me/mailchimp/search/members", companyId)}&${usp.toString()}`,
  );
}

export type SearchCampaignsResult = {
  results?: Array<{ campaign?: MailchimpCampaign; snippet?: string }>;
  total_items?: number;
};

export async function searchMailchimpCampaigns(
  companyId: string,
  query: string,
): Promise<SearchCampaignsResult> {
  return requestCRM<SearchCampaignsResult>(
    `${withCompany("/users/me/mailchimp/search/campaigns", companyId)}&query=${encodeURIComponent(query)}`,
  );
}

// ─── Customer Journey trigger ─────────────────────────────────────────────

export async function triggerMailchimpJourneyStep(
  companyId: string,
  journeyId: string,
  stepId: string,
  payload: { email_address: string },
): Promise<void> {
  await requestCRM<unknown>(
    withCompany(
      `/users/me/mailchimp/customer-journeys/journeys/${encodeURIComponent(journeyId)}/steps/${encodeURIComponent(stepId)}/trigger`,
      companyId,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agencies (per-COMPANY) + module access
//
// The agencies surface is independent of Mailchimp: rows live in the
// CRM and can optionally be pushed to a Mailchimp audience. Routes are
// embedded in /companies/:id/... so the URL itself carries the tenant,
// not a query string — that's intentional so a typo can never silently
// scope to the wrong company.
//
// Visibility within a company is gated by user_module_access; the owner
// manages grants via the /companies/:id/module-access surface below.
// ─────────────────────────────────────────────────────────────────────────────

export type AgencyStatus = "active" | "inactive" | "expired";

export type Agency = {
  id: string;
  company_id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status: AgencyStatus;
  tags: string[];
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type AgencyListResponse = {
  items: Agency[];
  total: number;
  limit: number;
  offset: number;
};

export type AgencyMutationPayload = {
  name?: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: AgencyStatus;
  tags?: string[];
};

export type AgencyListFilters = {
  status?: AgencyStatus;
  q?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
};

export async function listAgencies(
  companyId: string,
  filters: AgencyListFilters = {},
): Promise<AgencyListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  for (const tag of filters.tags ?? []) params.append("tag", tag);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return requestCRM<AgencyListResponse>(
    `/companies/${companyId}/agencies${qs ? `?${qs}` : ""}`,
  );
}

export async function getAgency(
  companyId: string,
  agencyId: string,
): Promise<Agency> {
  return requestCRM<Agency>(
    `/companies/${companyId}/agencies/${encodeURIComponent(agencyId)}`,
  );
}

export async function createAgency(
  companyId: string,
  payload: AgencyMutationPayload,
): Promise<Agency> {
  return requestCRM<Agency>(`/companies/${companyId}/agencies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateAgency(
  companyId: string,
  agencyId: string,
  payload: AgencyMutationPayload,
): Promise<Agency> {
  return requestCRM<Agency>(
    `/companies/${companyId}/agencies/${encodeURIComponent(agencyId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteAgency(
  companyId: string,
  agencyId: string,
): Promise<void> {
  await requestCRM<unknown>(
    `/companies/${companyId}/agencies/${encodeURIComponent(agencyId)}`,
    { method: "DELETE" },
  );
}

export type AgencyImportRow = {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: AgencyStatus;
  tags?: string[];
};

export type AgencyImportResponse = {
  created: number;
  errors: { index: number; error: string }[];
  total: number;
};

export async function importAgencies(
  companyId: string,
  rows: AgencyImportRow[],
): Promise<AgencyImportResponse> {
  return requestCRM<AgencyImportResponse>(
    `/companies/${companyId}/agencies/import`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    },
  );
}

export type AgencyPushResult = {
  agency_id: string;
  email?: string;
  status: "created" | "updated" | "skipped" | "error";
  reason?: string;
};

export type AgencyPushResponse = {
  audience_id: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  total_requested: number;
  results: AgencyPushResult[];
  completed_at: string;
};

export async function pushAgenciesToMailchimp(
  companyId: string,
  payload: {
    list_id: string;
    agency_ids: string[];
    update_existing?: boolean;
    extra_tags?: string[];
    default_status?: "subscribed" | "pending" | "unsubscribed";
  },
): Promise<AgencyPushResponse> {
  return requestCRM<AgencyPushResponse>(
    `/companies/${companyId}/agencies/push-to-mailchimp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

// ── Module access ────────────────────────────────────────────────────────

export type ModuleKey =
  | "marketing.agencies"
  | "leads.archive"
  | "crm.audit"
  | "leads.sla";

export type ModuleAccessGrant = {
  id: string;
  company_id: string;
  user_id: string;
  module_key: ModuleKey;
  granted: boolean;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type ModuleAccessResponse = {
  grants: ModuleAccessGrant[];
  known_modules: ModuleKey[];
};

export async function listModuleAccess(
  companyId: string,
): Promise<ModuleAccessResponse> {
  return requestCRM<ModuleAccessResponse>(
    `/companies/${companyId}/module-access`,
  );
}

export async function setModuleAccess(
  companyId: string,
  grants: { user_id: string; module_key: ModuleKey; granted: boolean }[],
): Promise<void> {
  await requestCRM<unknown>(`/companies/${companyId}/module-access`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grants }),
  });
}

export type SLACondition = "no_first_response" | "no_activity" | "stale_open";
export type SLARule = {
  id: string;
  name: string;
  condition: SLACondition;
  threshold_minutes: number;
  active: boolean;
};
export type SLAConfig = {
  rules: SLARule[];
  channel: "in_app" | "email";
  // Team-member user IDs that receive breach alerts (bell + email).
  recipients: string[];
};

export type SLABreach = {
  id: string;
  lead_id: string;
  rule_name: string;
  condition: string;
  assignee_user_id: string;
  breached_at: string;
  lead_name: string;
  lead_status: string;
};

function mapSLAConfig(res: Partial<SLAConfig>): SLAConfig {
  return {
    rules: Array.isArray(res.rules) ? res.rules : [],
    channel: res.channel === "email" ? "email" : "in_app",
    recipients: Array.isArray(res.recipients) ? res.recipients : [],
  };
}

/** SLA rule config for a company (admin — owner/super_admin/leads.sla). */
export async function getSLAConfig(companyId: string): Promise<SLAConfig> {
  return mapSLAConfig(await requestCRM<Partial<SLAConfig>>(`/companies/${companyId}/sla-rules`));
}

export async function setSLAConfig(companyId: string, config: SLAConfig): Promise<SLAConfig> {
  return mapSLAConfig(
    await requestCRM<Partial<SLAConfig>>(`/companies/${companyId}/sla-rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }),
  );
}

/** Open SLA breaches for the CURRENT user's notification bell — returns rows
 *  only when the caller is a configured recipient (empty otherwise). Any
 *  company member may call it. */
export async function listMySLAAlerts(
  companyId: string,
  page: { limit: number; offset: number } = { limit: 20, offset: 0 },
): Promise<{ data: SLABreach[]; total: number }> {
  const query = new URLSearchParams({ limit: String(page.limit), offset: String(page.offset) });
  const res = await requestCRM<{ data?: SLABreach[]; total?: number }>(
    `/companies/${companyId}/sla-alerts?${query.toString()}`,
  );
  return {
    data: Array.isArray(res.data) ? res.data : [],
    total: typeof res.total === "number" ? res.total : (res.data?.length ?? 0),
  };
}

/** Open (unresolved) SLA breaches for a company. */
export async function listSLABreaches(
  companyId: string,
  page: { limit: number; offset: number } = { limit: 50, offset: 0 },
): Promise<{ data: SLABreach[]; total: number }> {
  const query = new URLSearchParams({ limit: String(page.limit), offset: String(page.offset) });
  const res = await requestCRM<{ data?: SLABreach[]; total?: number }>(
    `/companies/${companyId}/sla-breaches?${query.toString()}`,
  );
  return {
    data: Array.isArray(res.data) ? res.data : [],
    total: typeof res.total === "number" ? res.total : (res.data?.length ?? 0),
  };
}

export type MyModuleAccess = { granted: ModuleKey[]; isOwner: boolean };

/** The current user's own granted modules for a company (+ owner flag). Used
 *  to decide whether to surface admin links (archived leads, audit log) to
 *  granted non-owners. */
export async function getMyModuleAccess(companyId: string): Promise<MyModuleAccess> {
  const query = new URLSearchParams({ company_id: companyId });
  const res = await requestCRM<{ granted?: string[]; is_owner?: boolean }>(
    `/users/me/module-access?${query.toString()}`,
  );
  return {
    granted: (Array.isArray(res.granted) ? res.granted : []) as ModuleKey[],
    isOwner: res.is_owner === true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Announcements (super-admin authored, platform-wide)
//
// Management endpoints (list/create/update/delete/publish) are gated to
// super admins by the BFF. The user-facing active/dismiss pair is open to
// any authenticated user. Localized content comes back already resolved to
// the requested locale by the Go service.
// ─────────────────────────────────────────────────────────────────────────────

export type AnnouncementStatus = "draft" | "published";

export type Announcement = {
  id: string;
  source_locale: string;
  title: string;
  body: string;
  translations: Record<string, { title: string; body: string }>;
  status: AnnouncementStatus;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ActiveAnnouncement = {
  id: string;
  title: string;
  body: string;
  published_at?: string | null;
};

export async function listAnnouncements(): Promise<Announcement[]> {
  const res = await requestCRM<{ items: Announcement[] }>("/announcements");
  return res.items ?? [];
}

export async function createAnnouncement(payload: {
  source_locale: string;
  title: string;
  body: string;
}): Promise<Announcement> {
  return requestCRM<Announcement>("/announcements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateAnnouncement(
  id: string,
  payload: { source_locale?: string; title?: string; body?: string },
): Promise<Announcement> {
  return requestCRM<Announcement>(`/announcements/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await requestCRM<unknown>(`/announcements/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function publishAnnouncement(id: string): Promise<void> {
  await requestCRM<unknown>(
    `/announcements/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
  );
}

export async function getActiveAnnouncements(
  locale: string,
): Promise<ActiveAnnouncement[]> {
  const res = await requestCRM<{ items: ActiveAnnouncement[] }>(
    `/announcements/active?locale=${encodeURIComponent(locale)}`,
  );
  return res.items ?? [];
}

export async function dismissAnnouncement(id: string): Promise<void> {
  await requestCRM<unknown>(
    `/announcements/${encodeURIComponent(id)}/dismiss`,
    { method: "POST" },
  );
}
