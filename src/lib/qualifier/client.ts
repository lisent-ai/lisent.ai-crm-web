"use client";

// ── Types ───────────────────────────────────────────────────────────────────

export type QualifierLead = {
  id: string;
  lead_id: string;
  name: string | null;
  phone: string | null;
  score: number;
  path: string;   // "fast" | "chat"
  status: string; // "new" | "qualifying" | "qualified" | "lost" | "done"
  extra_data: Record<string, unknown>;
  raw_payload: Record<string, unknown> | null;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ConversationMessage = {
  role: string;
  content: string;
  ts: number;
};

export type QualifierLeadDetail = QualifierLead & {
  session_id: string | null;
  session_score: number | null;
  stage: string | null;
  champ_json: Record<string, unknown> | null;
  messages: ConversationMessage[] | null;
  session_created_at: string | null;
  final_score: number | null;
  reasoning_json: Record<string, unknown> | null;
  handoff_champ_json: Record<string, unknown> | null;
  crm_sent: boolean | null;
  sent_at: string | null;
};

export type LeadFilterParams = {
  limit?: number;
  offset?: number;
  status?: string;
  score_min?: number;
  score_max?: number;
  source?: string;
  path?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
};

export type PaginatedLeads = {
  data: QualifierLead[];
  total: number;
  limit: number;
  offset: number;
};

export type ActiveSession = {
  session_id: string;
  lead_id: string;
  name: string;
  phone: string;
  stage: string;
  session_score: number;
  msg_count: number;
  session_created_at: string;
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type HandoffRecord = {
  id: string;
  lead_id: string;
  name: string;
  phone: string;
  final_score: number;
  crm_sent: boolean;
  sent_at: string | null;
  created_at: string;
};

// ── HTTP helper ─────────────────────────────────────────────────────────────

async function requestQualifier<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/qualifier/${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`Qualifier API error: ${res.status}`);
  return res.json() as Promise<T>;
}

// ── API functions ───────────────────────────────────────────────────────────

export async function listQualifierLeads(
  companyId: string,
  params?: LeadFilterParams,
): Promise<PaginatedLeads> {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
  }
  const qs = query.toString();
  const path = `leads/${companyId}${qs ? `?${qs}` : ""}`;
  return requestQualifier<PaginatedLeads>(path);
}

export async function getQualifierLeadDetail(
  companyId: string,
  leadId: string,
): Promise<QualifierLeadDetail> {
  return requestQualifier<QualifierLeadDetail>(`leads/${companyId}/${leadId}`);
}

export async function getActiveQualifierSessions(
  companyId: string,
): Promise<ActiveSession[]> {
  const data = await requestQualifier<{ data: ActiveSession[] }>(`leads/${companyId}/active-sessions`);
  return data.data;
}

// ── Delete Lead ─────────────────────────────────────────────────────────────

export async function deleteLead(companyId: string, leadId: string): Promise<void> {
  await requestQualifier(`leads/${companyId}/${leadId}`, { method: "DELETE" });
}

// ── Status Lifecycle ────────────────────────────────────────────────────────

export async function updateLeadStatus(
  companyId: string,
  leadId: string,
  status: string,
  reason: string = "",
  actor: string = "dashboard",
): Promise<{ ok: boolean; previous_status: string; new_status: string }> {
  return requestQualifier(`leads/${companyId}/${leadId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason, actor }),
  });
}

// ── Activity Timeline ───────────────────────────────────────────────────────

export async function getLeadActivity(
  companyId: string,
  leadId: string,
  limit: number = 50,
): Promise<{ data: ActivityEvent[]; total: number }> {
  return requestQualifier(`leads/${companyId}/${leadId}/activity?limit=${limit}`);
}

// ── Assignment ──────────────────────────────────────────────────────────────

export async function assignLead(
  companyId: string,
  leadId: string,
  assignedTo: string,
  assignedBy: string = "dashboard",
): Promise<{ ok: boolean; assigned_to: string }> {
  return requestQualifier(`leads/${companyId}/${leadId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assigned_to: assignedTo, assigned_by: assignedBy }),
  });
}

// ── CRM Handoffs ────────────────────────────────────────────────────────────

export async function getHandoffs(
  companyId: string,
): Promise<{ data: HandoffRecord[]; total: number }> {
  return requestQualifier(`handoffs/${companyId}`);
}

// ── Bulk Operations ─────────────────────────────────────────────────────────

export async function bulkAction(
  companyId: string,
  leadIds: string[],
  action: string,
  params: Record<string, string>,
): Promise<{ affected: number; total: number }> {
  return requestQualifier(`leads/${companyId}/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_ids: leadIds, action, params }),
  });
}

// ── CSV Export ──────────────────────────────────────────────────────────────

export function getExportUrl(companyId: string, params?: LeadFilterParams): string {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.score_min !== undefined) query.set("score_min", String(params.score_min));
  if (params?.score_max !== undefined) query.set("score_max", String(params.score_max));
  if (params?.source) query.set("source", params.source);
  if (params?.path) query.set("path", params.path);
  const qs = query.toString();
  return `/api/qualifier/leads/${companyId}/export${qs ? `?${qs}` : ""}`;
}

// ── Session Takeover ────────────────────────────────────────────────────────

export async function startAI(
  companyId: string, sessionId: string,
): Promise<{ ok: boolean; previous_stage: string; new_stage: string }> {
  return requestQualifier(`sessions/${companyId}/${sessionId}/start-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "dashboard" }),
  });
}

export async function takeoverSession(
  companyId: string, sessionId: string,
): Promise<{ ok: boolean; previous_stage: string; new_stage: string }> {
  return requestQualifier(`sessions/${companyId}/${sessionId}/takeover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "dashboard" }),
  });
}

export async function sendManualMessage(
  companyId: string, sessionId: string, message: string,
): Promise<{ ok: boolean; whatsapp_sent: boolean; msg_count: number }> {
  return requestQualifier(`sessions/${companyId}/${sessionId}/send-manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, actor: "dashboard" }),
  });
}

export async function resumeAI(
  companyId: string, sessionId: string,
): Promise<{ ok: boolean; new_stage: string }> {
  return requestQualifier(`sessions/${companyId}/${sessionId}/resume-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: "dashboard" }),
  });
}

export async function getSessionInfo(
  companyId: string, sessionId: string,
): Promise<{ session_id: string; stage: string; score: number; msg_count: number; messages: ConversationMessage[] }> {
  return requestQualifier(`sessions/${companyId}/${sessionId}`);
}
