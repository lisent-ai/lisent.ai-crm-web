"use client";

import { readLocaleCookie } from "@/lib/i18n/locale-client";

export type QualifierLead = {
  id: string;
  lead_id: string;
  name: string;
  phone: string;
  score: number;
  path: string;   // "fast" | "chat"
  status: string; // "new" | "done"
  extra_data: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
};

async function requestQualifier<T>(path: string): Promise<T> {
  const res = await fetch(`/api/qualifier/${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Qualifier API error: ${res.status}`);
  return res.json() as Promise<T>;
}

function withLocale(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }
  const record = body as Record<string, unknown>;
  if ("language" in record && record.language) {
    return record;
  }
  const locale = readLocaleCookie();
  if (!locale) {
    return record;
  }
  return { ...record, language: locale };
}

async function postQualifier<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/qualifier/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withLocale(body) ?? {}),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Qualifier API error: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function listQualifierLeads(
  companyId: string,
): Promise<QualifierLead[]> {
  const data = await requestQualifier<{ data: QualifierLead[] }>(`leads/${companyId}`);
  return data.data;
}

export type RagDocument = {
  doc_ref: string;
  title: string | null;
  source_url: string | null;
  chunk_count: number;
  updated_at: string | null;
};

export async function listRagDocuments(
  companyId: string,
  limit = 1000,
): Promise<RagDocument[]> {
  return requestQualifier<RagDocument[]>(`rag/${companyId}/documents?limit=${limit}`);
}

export type RagChunk = {
  id: string;
  doc_ref: string;
  chunk_index: number;
  title: string;
  content: string;
  source_url: string | null;
  metadata: Record<string, unknown>;
};

export async function getRagDocument(
  companyId: string,
  recordId: string,
): Promise<{ doc_ref: string; chunks: RagChunk[] }> {
  return requestQualifier(
    `rag/${companyId}/documents/${encodeURIComponent(recordId)}`,
  );
}

export type StartQualifyResponse = {
  ok: boolean;
  session_id?: string;
  new_stage?: string;
  already_active?: boolean;
  stage?: string;
};

export async function startLeadQualify(
  companyId: string,
  leadId: string,
  actor = "dashboard",
): Promise<StartQualifyResponse> {
  return postQualifier(
    `leads/${companyId}/${encodeURIComponent(leadId)}/start-qualify`,
    { actor },
  );
}
