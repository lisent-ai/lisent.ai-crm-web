"use client";

export type QualifierLead = {
  id: string;
  lead_id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  project_type: string;
  budget_range: string;
  score: number;
  path: string;   // "fast" | "chat"
  status: string; // "new" | "chat" | "done"
  raw_payload: Record<string, unknown>;
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
