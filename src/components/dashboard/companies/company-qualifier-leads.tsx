"use client";

import { useState, useEffect } from "react";
import { listQualifierLeads, type QualifierLead } from "@/lib/qualifier/client";

type Props = { companyId: string };

const STATUS_LABEL: Record<string, string> = {
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  referral: "Referans",
  other: "Diğer",
};

const PROJECT_LABEL: Record<string, string> = {
  residential: "Konut",
  commercial: "Ticari",
  industrial: "Sanayi",
  renovation: "Tadilat",
  land: "Arsa",
  other: "Diğer",
};

const BUDGET_LABEL: Record<string, string> = {
  under_500k: "< 500K",
  "500k_1m": "500K – 1M",
  "1m_3m": "1M – 3M",
  "3m_10m": "3M – 10M",
  over_10m: "> 10M",
  unknown: "Belirtilmedi",
};

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function LeadCard({ lead }: { lead: QualifierLead }) {
  const ex = lead.extra_data ?? {};
  const projectType = ex.project_type as string | undefined;
  const budgetRange = ex.budget_range as string | undefined;
  const source = ex.source as string | undefined;
  const city = ex.city as string | undefined;

  // extra_data'dan bilinen alanları çıkar, kalanları göster
  const knownKeys = new Set(["project_type", "budget_range", "source", "city", "email",
    "decision_authority", "timeline_urgency", "budget_amount", "notes"]);
  const unknownExtras = Object.entries(ex).filter(([k]) => !knownKeys.has(k));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{lead.name || "—"}</p>
          <p className="text-xs text-slate-500">{lead.phone}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(lead.score)}`}>
          {lead.score} puan
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {projectType && projectType !== "other" && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            {PROJECT_LABEL[projectType] ?? projectType}
          </span>
        )}
        {budgetRange && budgetRange !== "unknown" && (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
            {BUDGET_LABEL[budgetRange] ?? budgetRange}
          </span>
        )}
        {source && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {STATUS_LABEL[source] ?? source}
          </span>
        )}
        {city && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {city}
          </span>
        )}
        {unknownExtras.map(([k, v]) => (
          <span key={k} className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
            {k}: {String(v)}
          </span>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        {new Date(lead.created_at).toLocaleString("tr-TR", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function Column({ title, leads, accent }: { title: string; leads: QualifierLead[]; accent: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`mb-3 flex items-center gap-2`}>
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {leads.length}
        </span>
      </div>
      <div className="space-y-2">
        {leads.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1">Henüz lead yok</p>
        ) : (
          leads.map((l) => <LeadCard key={l.id} lead={l} />)
        )}
      </div>
    </div>
  );
}

export function CompanyQualifierLeads({ companyId }: Readonly<Props>) {
  const [leads, setLeads] = useState<QualifierLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listQualifierLeads(companyId)
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  const processing = leads.filter((l) => l.path === "chat" && l.status !== "done");
  const done = leads.filter((l) => l.path === "fast" || l.status === "done");

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-400">Leadler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-950">Qualifier Leads</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            listQualifierLeads(companyId)
              .then(setLeads)
              .catch(() => setLeads([]))
              .finally(() => setLoading(false));
          }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Yenile
        </button>
      </div>

      <div className="flex gap-4">
        <Column
          title="İşlemde"
          leads={processing}
          accent="bg-amber-400"
        />
        <div className="w-px bg-slate-100 shrink-0" />
        <Column
          title="Tamamlandı"
          leads={done}
          accent="bg-emerald-400"
        />
      </div>
    </div>
  );
}
