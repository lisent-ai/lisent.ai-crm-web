"use client";

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
