"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  listQualifierLeads,
  getQualifierLeadDetail,
  getActiveQualifierSessions,
  type QualifierLead,
  type QualifierLeadDetail,
  type ActiveSession,
  type LeadFilterParams,
  type PaginatedLeads,
} from "@/lib/qualifier/client";
import { CompanyQualifierPanel } from "../company-qualifier-panel";
import { QualifierAIConfig } from "./qualifier-ai-config";
import { QualifierLeadFilters } from "./qualifier-lead-filters";
import { QualifierLeadTable } from "./qualifier-lead-table";
import { QualifierLeadDetailView } from "./qualifier-lead-detail";
import { QualifierEmptyState } from "./qualifier-empty-state";
import { TableSkeleton, SessionsSkeleton } from "./qualifier-skeleton";

type Props = {
  companyId: string;
};

type Tab = "leads" | "sessions" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "leads", label: "Leadler" },
  { key: "sessions", label: "Aktif Oturumlar" },
  { key: "settings", label: "Ayarlar" },
];

// ── Active Sessions Panel ───────────────────────────────────────────────────

function ActiveSessionsPanel({ companyId, onSelectLead }: { companyId: string; onSelectLead: (leadId: string) => void }) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(() => {
    getActiveQualifierSessions(companyId)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  if (loading) return <SessionsSkeleton />;

  if (sessions.length === 0) {
    return (
      <QualifierEmptyState
        title="Aktif oturum yok"
        description="Su anda devam eden bir AI sohbet oturumu bulunmuyor."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => {
        const elapsed = Math.floor((Date.now() - new Date(s.session_created_at).getTime()) / 60000);
        return (
          <button
            type="button"
            key={s.session_id}
            onClick={() => onSelectLead(s.lead_id)}
            className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 space-y-2 transition hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{s.name || "\u2014"}</p>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="text-xs text-slate-500">{s.phone}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{s.stage}</span>
              <span>{s.msg_count} mesaj</span>
              <span className="ml-auto">{elapsed} dk</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function QualifierDashboard({ companyId }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState<Tab>("leads");
  const [filters, setFilters] = useState<LeadFilterParams>({ limit: 20, sort_by: "created_at", sort_dir: "desc" });
  const [leadsData, setLeadsData] = useState<PaginatedLeads>({ data: [], total: 0, limit: 20, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Selected lead detail
  const [selectedDetail, setSelectedDetail] = useState<QualifierLeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch leads
  const fetchLeads = useCallback(
    (params: LeadFilterParams) => {
      setLoading(true);
      listQualifierLeads(companyId, params)
        .then(setLeadsData)
        .catch(() => setLeadsData({ data: [], total: 0, limit: params.limit ?? 20, offset: params.offset ?? 0 }))
        .finally(() => setLoading(false));
    },
    [companyId],
  );

  useEffect(() => {
    fetchLeads(filters);
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiltersChange(newFilters: LeadFilterParams) {
    setFilters(newFilters);
    startTransition(() => {
      fetchLeads(newFilters);
    });
  }

  async function handleSelectLead(lead: QualifierLead) {
    setDetailLoading(true);
    try {
      const detail = await getQualifierLeadDetail(companyId, lead.id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error("Lead detail fetch failed:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSelectedDetail(null);
  }

  // If showing lead detail, render it full-width
  if (selectedDetail) {
    return (
      <QualifierLeadDetailView
        companyId={companyId}
        detail={selectedDetail}
        onBack={() => { setSelectedDetail(null); fetchLeads(filters); }}
      />
    );
  }

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      {/* Tabs */}
      <div className="sticky top-0 z-10 glass-card flex items-center gap-1 rounded-xl px-1 py-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={`relative rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={`${isPending ? "opacity-60" : "opacity-100"} transition-opacity duration-200`} key={activeTab}>
        {activeTab === "leads" && (
          <div className="space-y-4">
            <QualifierLeadFilters companyId={companyId} value={filters} onChange={handleFiltersChange} />

            {loading ? (
              <TableSkeleton />
            ) : leadsData.data.length === 0 ? (
              <QualifierEmptyState
                title="Lead bulunamadi"
                description="Secili filtrelerle eslesen lead yok. Filtreleri degistirmeyi veya webhook URL olusturmayi deneyin."
              />
            ) : (
              <QualifierLeadTable
                companyId={companyId}
                leads={leadsData.data}
                total={leadsData.total}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onSelectLead={handleSelectLead}
                onRefresh={() => fetchLeads(filters)}
              />
            )}

            {detailLoading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20">
                <div className="rounded-2xl bg-white px-6 py-4 shadow-xl">
                  <p className="text-sm text-slate-600">Lead detayi yukleniyor...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "sessions" && (
          <ActiveSessionsPanel
            companyId={companyId}
            onSelectLead={async (leadId) => {
              setDetailLoading(true);
              try {
                const detail = await getQualifierLeadDetail(companyId, leadId);
                setSelectedDetail(detail);
              } catch { /* stay */ }
              finally { setDetailLoading(false); }
            }}
          />
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <CompanyQualifierPanel companyId={companyId} />
            <div className="border-t border-slate-200 pt-6">
              <QualifierAIConfig companyId={companyId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
