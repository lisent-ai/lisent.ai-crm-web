"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { QualifierLeadDetail, ConversationMessage } from "@/lib/qualifier/client";
import { getQualifierLeadDetail } from "@/lib/qualifier/client";
import { QualifierBantRadar } from "./qualifier-bant-radar";
import { QualifierConversation } from "./qualifier-conversation";
import { QualifierReasoning } from "./qualifier-reasoning";
import { QualifierStatusActions } from "./qualifier-status-actions";
import { QualifierActivityTimeline } from "./qualifier-activity-timeline";
import { QualifierTakeover } from "./qualifier-takeover";

type Props = {
  companyId: string;
  detail: QualifierLeadDetail;
  onBack: () => void;
};

const SOURCE_LABEL: Record<string, string> = {
  website: "Website", facebook: "Facebook", instagram: "Instagram",
  google: "Google", whatsapp: "WhatsApp", referral: "Referans",
};

const PROJECT_LABEL: Record<string, string> = {
  residential: "Konut", commercial: "Ticari", industrial: "Sanayi",
  renovation: "Tadilat", land: "Arsa",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Yeni", contacted: "Iletisime Gecildi", qualifying: "Degerlendiriliyor",
  qualified: "Kalifiye", negotiation: "Muzakere", won: "Kazanildi",
  lost: "Kaybedildi", archived: "Arsivlendi",
};

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function statusColor(status: string) {
  if (status === "qualified" || status === "won") return "bg-emerald-100 text-emerald-700";
  if (status === "qualifying" || status === "contacted" || status === "negotiation") return "bg-amber-100 text-amber-700";
  if (status === "lost") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

type DetailTab = "overview" | "conversation" | "activity";

export function QualifierLeadDetailView({ companyId, detail, onBack }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [currentStatus, setCurrentStatus] = useState(detail.status);
  const [currentStage, setCurrentStage] = useState(detail.stage ?? "CHAT");
  const [liveMessages, setLiveMessages] = useState<ConversationMessage[]>(detail.messages ?? []);
  const [liveScore, setLiveScore] = useState(detail.final_score ?? detail.score);
  const [liveChamp, setLiveChamp] = useState<Record<string, unknown> | null>(detail.champ_json ?? detail.handoff_champ_json ?? null);
  const [liveReasoning, setLiveReasoning] = useState<Record<string, unknown> | null>(detail.reasoning_json ?? null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTakeover = currentStage === "HUMAN_TAKEOVER";
  const isActiveSession = !!detail.session_id &&
    ["PENDING", "CHAT", "HUMAN_TAKEOVER"].includes(currentStage);

  // ── Unified polling: refresh full detail (score, CHAMP, messages, stage) ──
  const pollDetail = useCallback(async () => {
    try {
      const fresh = await getQualifierLeadDetail(companyId, detail.id);
      setLiveScore(fresh.final_score ?? fresh.score);
      setLiveChamp(fresh.champ_json ?? fresh.handoff_champ_json ?? null);
      setLiveMessages(fresh.messages ?? []);
      if (fresh.reasoning_json) setLiveReasoning(fresh.reasoning_json);
      if (fresh.stage) setCurrentStage(fresh.stage);
      if (fresh.status) setCurrentStatus(fresh.status);
    } catch { /* silent */ }
  }, [companyId, detail.id]);

  useEffect(() => {
    if (!isActiveSession) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    // Takeover needs faster updates (manual chat), otherwise 8s
    const ms = isTakeover ? 5_000 : 8_000;
    pollingRef.current = setInterval(pollDetail, ms);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isActiveSession, isTakeover, pollDetail]);

  const handleStageChanged = useCallback((stage: string) => {
    setCurrentStage(stage);
    pollDetail();
  }, [pollDetail]);

  const handleMessageSent = useCallback(() => {
    pollDetail();
  }, [pollDetail]);

  const ex = detail.extra_data ?? {};
  const rawPayload = detail.raw_payload ?? {};
  // Prefer top-level columns (from LLM mapping), fallback to extra_data (legacy)
  const leadSource = detail.source || ex.source || "";
  const leadProjectType = detail.project_type || ex.project_type || "";
  const leadBudgetRange = detail.budget_range || ex.budget_range || "";
  const leadCity = detail.city || ex.city || "";
  const leadEmail = detail.email || ex.email || "";
  const messages = liveMessages.length > 0 ? liveMessages : (detail.messages ?? []);
  const champ = liveChamp;
  const finalScore = liveScore;
  const createdDate = new Date(detail.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  const createdTime = new Date(detail.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const [rawExpanded, setRawExpanded] = useState(false);

  const TABS: { key: DetailTab; label: string; count?: number }[] = [
    { key: "overview", label: "Genel Bakis" },
    { key: "conversation", label: "Konusma", count: messages.length },
    { key: "activity", label: "Aktivite" },
  ];

  return (
    <div className="space-y-5 animate-[slideInRight_0.3s_ease-out]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:border-slate-400 hover:shadow-sm active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-slate-950 truncate">{detail.name || "Isimsiz"}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{detail.phone || "Telefon yok"}</span>
            {leadEmail ? <><span className="text-slate-300">|</span><span>{String(leadEmail)}</span></> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(finalScore)}`}>
            {finalScore} puan
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(currentStatus)}`}>
            {STATUS_LABEL[currentStatus] ?? currentStatus}
          </span>
          {detail.crm_sent !== null && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${detail.crm_sent ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
              {detail.crm_sent ? "CRM OK" : "CRM Bekliyor"}
            </span>
          )}
        </div>
      </div>

      {/* ── Contact card + Status actions ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-2">
          {leadSource ? <InfoPill icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" label={SOURCE_LABEL[String(leadSource)] ?? String(leadSource)} /> : null}
          {leadProjectType ? <InfoPill icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" label={PROJECT_LABEL[String(leadProjectType)] ?? String(leadProjectType)} /> : null}
          {leadBudgetRange ? <InfoPill icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label={String(leadBudgetRange)} /> : null}
          {leadCity ? <InfoPill icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" label={String(leadCity)} /> : null}
          <InfoPill icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label={`${createdDate} ${createdTime}`} />
          <InfoPill icon="M13 10V3L4 14h7v7l9-11h-7z" label={detail.path === "fast" ? "Hizli Yol" : "Sohbet"} />
          {detail.sent_at && (
            <InfoPill icon="M5 13l4 4L19 7" label={`CRM: ${new Date(detail.sent_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`} />
          )}
        </div>
        <QualifierStatusActions
          companyId={companyId}
          leadId={detail.id}
          currentStatus={currentStatus}
          onStatusChanged={setCurrentStatus}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-violet-600 text-violet-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
          {/* Duplicate warning */}
          {detail.duplicate_of && (
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Olasi kopya kayit.</span>{" "}
                Ayni telefon numarasi ile daha once lead olusturulmus.
              </p>
            </div>
          )}

          {/* CHAMP Analysis Dashboard */}
          <div>
            {champ && (
              <QualifierBantRadar
                compositeScore={finalScore}
                champ={{
                  challenges: Number(champ.challenges_score ?? champ.challenges ?? 0),
                  authority: Number(champ.authority_score ?? champ.authority ?? 0),
                  money: Number(champ.money_score ?? champ.money ?? 0),
                  prioritization: Number(champ.prioritization_score ?? champ.prioritization ?? 0),
                }}
                notes={{
                  challenges_notes: champ.challenges_notes as string | undefined,
                  authority_notes: champ.authority_notes as string | undefined,
                  money_notes: champ.money_notes as string | undefined,
                  prioritization_notes: champ.prioritization_notes as string | undefined,
                }}
                holistic={{
                  holistic_score: champ.holistic_score as number | undefined,
                  holistic_reasoning: champ.holistic_reasoning as string | undefined,
                  icp_fit_assessment: champ.icp_fit_assessment as string | undefined,
                  negative_signals: champ.negative_signals as string[] | undefined,
                  negative_reasoning: champ.negative_reasoning as string | undefined,
                  recommended_next_question: champ.recommended_next_question as string | undefined,
                  missing_info: champ.missing_info as string[] | undefined,
                  challenges_confidence: champ.challenges_confidence as number | undefined,
                  authority_confidence: champ.authority_confidence as number | undefined,
                  money_confidence: champ.money_confidence as number | undefined,
                  prioritization_confidence: champ.prioritization_confidence as number | undefined,
                  sector_qualifiers: champ.sector_qualifiers as Record<string, unknown> | undefined,
                  scoring_mode: champ.scoring_mode as string | undefined,
                }}
              />
            )}
          </div>

          {/* AI Reasoning */}
          {liveReasoning && (
            <QualifierReasoning reasoning={liveReasoning} />
          )}

          {/* Takeover / AI Control (for chat-path leads with sessions) */}
          {detail.session_id && detail.path === "chat" && (
            <QualifierTakeover
              companyId={companyId}
              sessionId={detail.session_id}
              currentStage={currentStage}
              onStageChanged={handleStageChanged}
              onMessageSent={handleMessageSent}
            />
          )}

          {/* Gönderilen Veriler (Raw Payload) */}
          {Object.keys(rawPayload).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setRawExpanded((p) => !p)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-slate-700">Gonderilen Veriler</span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round"
                  className={`text-slate-400 transition-transform ${rawExpanded ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {rawExpanded && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="space-y-1.5">
                    {Object.entries(rawPayload).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-3 text-sm">
                        <span className="shrink-0 font-mono text-xs text-slate-400 min-w-[120px]">{key}</span>
                        <span className="text-slate-700 break-all">
                          {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversation */}
      {activeTab === "conversation" && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
          {messages.length > 0 ? (
            <QualifierConversation messages={messages} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-3">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-medium text-slate-500">Henuz konusma yok</p>
              <p className="text-xs text-slate-400 mt-1">Bu lead hizli yol ile degerlendirildiyse konusma olmayabilir.</p>
            </div>
          )}
        </div>
      )}

      {/* Activity */}
      {activeTab === "activity" && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
          <QualifierActivityTimeline companyId={companyId} leadId={detail.id} />
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function InfoPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
        <path d={icon} />
      </svg>
      {label}
    </span>
  );
}
