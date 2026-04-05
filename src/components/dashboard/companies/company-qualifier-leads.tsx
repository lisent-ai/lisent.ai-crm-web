"use client";

import { useState, useEffect } from "react";
import {
  listQualifierLeads,
  getQualifierLeadDetail,
  type QualifierLead,
  type QualifierLeadDetail,
  type ConversationMessage,
} from "@/lib/qualifier/client";

type Props = { companyId: string };

const SOURCE_LABEL: Record<string, string> = {
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

function scoreBorder(score: number) {
  if (score >= 80) return "border-emerald-200";
  if (score >= 50) return "border-amber-200";
  return "border-slate-200";
}

// ── Processing Lead Card (unchanged) ────────────────────────────────────────

function LeadCard({ lead }: { lead: QualifierLead }) {
  const ex = lead.extra_data ?? {};
  const projectType = ex.project_type as string | undefined;
  const budgetRange = ex.budget_range as string | undefined;
  const source = ex.source as string | undefined;
  const city = ex.city as string | undefined;

  const knownKeys = new Set([
    "project_type", "budget_range", "source", "city", "email",
    "decision_authority", "timeline_urgency", "budget_amount", "notes",
  ]);
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
            {SOURCE_LABEL[source] ?? source}
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

// ── Conversation Bubble ─────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-violet-600 text-white rounded-br-md"
            : "bg-slate-100 text-slate-800 rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.ts > 0 && (
          <p className={`mt-1 text-[10px] ${isUser ? "text-violet-200" : "text-slate-400"}`}>
            {new Date(message.ts * 1000).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Lead Detail Panel ───────────────────────────────────────────────────────

function LeadDetailPanel({
  detail,
  onBack,
}: {
  detail: QualifierLeadDetail;
  onBack: () => void;
}) {
  const ex = detail.extra_data ?? {};
  const messages = detail.messages ?? [];
  const bant = detail.champ_json ?? detail.handoff_champ_json;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
        >
          Geri
        </button>
        <div className="flex-1">
          <p className="text-lg font-semibold text-slate-950">{detail.name || "—"}</p>
          <p className="text-sm text-slate-500">{detail.phone}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(detail.final_score ?? detail.score)}`}>
          {detail.final_score ?? detail.score} puan
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ex.project_type ? (
          <InfoCell label="Proje Tipi" value={PROJECT_LABEL[String(ex.project_type)] ?? String(ex.project_type)} />
        ) : null}
        {ex.budget_range ? (
          <InfoCell label="Bütçe" value={BUDGET_LABEL[String(ex.budget_range)] ?? String(ex.budget_range)} />
        ) : null}
        {ex.source ? (
          <InfoCell label="Kaynak" value={SOURCE_LABEL[String(ex.source)] ?? String(ex.source)} />
        ) : null}
        {ex.city ? <InfoCell label="Şehir" value={String(ex.city)} /> : null}
        {ex.email ? <InfoCell label="E-posta" value={String(ex.email)} /> : null}
        <InfoCell label="Yol" value={detail.path === "fast" ? "Hızlı Yol" : "Sohbet"} />
        <InfoCell label="Durum" value={detail.status === "done" ? "Tamamlandı" : detail.status} />
        {detail.crm_sent !== null ? (
          <InfoCell label="CRM'e Gönderildi" value={detail.crm_sent ? "Evet" : "Hayır"} />
        ) : null}
        {detail.sent_at ? (
          <InfoCell
            label="Gönderim Zamanı"
            value={new Date(detail.sent_at).toLocaleString("tr-TR", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          />
        ) : null}
      </div>

      {/* BANT Scores */}
      {bant && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">BANT Skorları</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BantBar label="Bütçe" value={Number(bant.budget ?? 0)} max={25} />
            <BantBar label="Yetki" value={Number(bant.authority ?? 0)} max={25} />
            <BantBar label="İhtiyaç" value={Number(bant.need ?? 0)} max={25} />
            <BantBar label="Zamanlama" value={Number(bant.timeline ?? 0)} max={25} />
          </div>
        </div>
      )}

      {/* Reasoning */}
      {detail.reasoning_json && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">AI Değerlendirmesi</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
            {typeof detail.reasoning_json === "object"
              ? (detail.reasoning_json.summary as string) ??
                (detail.reasoning_json.report as string) ??
                JSON.stringify(detail.reasoning_json, null, 2)
              : String(detail.reasoning_json)}
          </p>
        </div>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            Konuşma ({messages.length} mesaj)
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg bg-slate-50 p-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function BantBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-semibold">{value}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-200">
        <div
          className="h-1.5 rounded-full bg-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Column (for processing leads) ───────────────────────────────────────────

function Column({ title, leads, accent }: { title: string; leads: QualifierLead[]; accent: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-3 flex items-center gap-2">
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

// ── Completed Leads Panel ───────────────────────────────────────────────────

function CompletedLeadsPanel({
  companyId,
  leads,
  onBack,
}: {
  companyId: string;
  leads: QualifierLead[];
  onBack: () => void;
}) {
  const [selectedDetail, setSelectedDetail] = useState<QualifierLeadDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSelectLead(lead: QualifierLead) {
    setLoadingId(lead.id);
    try {
      const detail = await getQualifierLeadDetail(companyId, lead.id);
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(null);
    } finally {
      setLoadingId(null);
    }
  }

  if (selectedDetail) {
    return (
      <LeadDetailPanel
        detail={selectedDetail}
        onBack={() => setSelectedDetail(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
        >
          Geri
        </button>
        <p className="text-lg font-semibold text-slate-950">Tamamlanan Leadler</p>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          {leads.length}
        </span>
      </div>

      <div className="space-y-2">
        {leads.map((lead) => {
          const ex = lead.extra_data ?? {};
          const isLoading = loadingId === lead.id;
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => handleSelectLead(lead)}
              disabled={isLoading}
              className={`w-full text-left rounded-xl border ${scoreBorder(lead.score)} bg-white p-4 shadow-sm transition hover:shadow-md hover:border-violet-300 disabled:opacity-60`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {lead.name || "—"}
                  </p>
                  <p className="text-xs text-slate-500">{lead.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {ex.project_type && String(ex.project_type) !== "other" ? (
                    <span className="hidden sm:inline rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {PROJECT_LABEL[String(ex.project_type)] ?? String(ex.project_type)}
                    </span>
                  ) : null}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(lead.score)}`}>
                    {lead.score}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {isLoading ? "Yükleniyor..." : ""}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CompanyQualifierLeads({ companyId }: Readonly<Props>) {
  const [leads, setLeads] = useState<QualifierLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    listQualifierLeads(companyId)
      .then((res) => setLeads(res.data))
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

  if (showCompleted) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <CompletedLeadsPanel
          companyId={companyId}
          leads={done}
          onBack={() => setShowCompleted(false)}
        />
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
              .then((res) => setLeads(res.data))
              .catch(() => setLeads([]))
              .finally(() => setLoading(false));
          }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Yenile
        </button>
      </div>

      <div className="flex gap-4">
        {/* Processing column */}
        <Column title="İşlemde" leads={processing} accent="bg-amber-400" />

        <div className="w-px bg-slate-100 shrink-0" />

        {/* Completed — replaced with button */}
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-sm font-semibold text-slate-700">Tamamlandı</p>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {done.length}
            </span>
          </div>

          {done.length === 0 ? (
            <p className="text-xs text-slate-400 italic px-1">Henüz tamamlanan lead yok</p>
          ) : (
            <button
              type="button"
              onClick={() => setShowCompleted(true)}
              className="w-full rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-center shadow-sm transition hover:shadow-md hover:border-emerald-300"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-700">
                  {done.length}
                </span>
                <p className="text-sm font-semibold text-slate-700">Tamamlanan Lead</p>
                <p className="text-xs text-slate-500">
                  Detayları ve konuşmaları görüntüle
                </p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
