"use client";

import { useState } from "react";
import type { QualifierLead, LeadFilterParams } from "@/lib/qualifier/client";
import { bulkAction, deleteLead } from "@/lib/qualifier/client";

type Props = {
  companyId: string;
  leads: QualifierLead[];
  total: number;
  filters: LeadFilterParams;
  onFiltersChange: (params: LeadFilterParams) => void;
  onSelectLead: (lead: QualifierLead) => void;
  onRefresh: () => void;
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
  qualified: "Kalifiye", done: "Tamamlandi", lost: "Kayip",
  negotiation: "Muzakere", won: "Kazanildi", archived: "Arsivlendi",
};

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function statusColor(status: string) {
  if (status === "qualified" || status === "done" || status === "won") return "bg-emerald-50 text-emerald-700";
  if (status === "qualifying" || status === "contacted" || status === "negotiation") return "bg-amber-50 text-amber-700";
  if (status === "lost") return "bg-rose-50 text-rose-600";
  return "bg-slate-50 text-slate-600";
}

type SortableColumn = "name" | "score" | "status" | "created_at";

export function QualifierLeadTable({
  companyId, leads, total, filters, onFiltersChange, onSelectLead, onRefresh,
}: Readonly<Props>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  async function handleBulkAction(action: string, params: Record<string, string>) {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      await bulkAction(companyId, Array.from(selectedIds), action, params);
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      // error handling
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleDelete(leadId: string) {
    setDeleting(true);
    try {
      await deleteLead(companyId, leadId);
      setDeleteConfirm(null);
      onRefresh();
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteLead(companyId, id)));
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      // silent
    } finally {
      setBulkProcessing(false);
    }
  }

  function handleSort(col: SortableColumn) {
    const isSame = filters.sort_by === col;
    onFiltersChange({
      ...filters,
      sort_by: col,
      sort_dir: isSame && filters.sort_dir === "desc" ? "asc" : "desc",
    });
  }

  function sortIndicator(col: string) {
    if (filters.sort_by !== col) return "";
    return filters.sort_dir === "asc" ? " \u2191" : " \u2193";
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-violet-200/60 bg-violet-50/80 backdrop-blur-sm px-4 py-2.5 shadow-sm animate-[slideUp_0.2s_ease-out]">
          <span className="text-sm font-semibold text-violet-700">{selectedIds.size} lead secildi</span>
          <div className="ml-auto flex items-center gap-2">
            <select
              disabled={bulkProcessing}
              onChange={(e) => {
                if (e.target.value) handleBulkAction("status_change", { status: e.target.value });
                e.target.value = "";
              }}
              className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-slate-700"
              defaultValue=""
            >
              <option value="" disabled>Durum degistir...</option>
              <option value="contacted">Iletisime Gecildi</option>
              <option value="qualifying">Degerlendiriliyor</option>
              <option value="qualified">Kalifiye</option>
              <option value="lost">Kayip</option>
            </select>

            <button
              type="button"
              disabled={bulkProcessing}
              onClick={handleBulkDelete}
              className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {bulkProcessing ? "Siliniyor..." : "Sil"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Iptal
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/80">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort("name")}>
                Ad{sortIndicator("name")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Telefon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort("score")}>
                Skor{sortIndicator("score")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kaynak</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Yol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort("status")}>
                Durum{sortIndicator("status")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort("created_at")}>
                Tarih{sortIndicator("created_at")}
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="stagger-children divide-y divide-slate-50">
            {leads.map((lead) => {
              const ex = lead.extra_data ?? {};
              const isSelected = selectedIds.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={`transition ${isSelected ? "bg-violet-50/60" : "hover:bg-slate-50/80"}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 cursor-pointer hover:text-violet-700" onClick={() => onSelectLead(lead)}>
                    <div className="flex items-center gap-1.5">
                      {lead.name || "Isimsiz"}
                      {lead.duplicate_of && (
                        <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-600" title="Olasi kopya kayit">KOPYA?</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.phone || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {SOURCE_LABEL[String(lead.source || ex.source || "")] ?? String(lead.source || ex.source || "\u2014")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {lead.path === "fast" ? "Hizli" : "Sohbet"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(lead.status)}`}>
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(lead.id); }}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Sil"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-lg font-semibold text-slate-900">Lead Sil</h3>
            <p className="text-sm text-slate-600">Bu lead kalici olarak silinecek. Bu islem geri alinamaz.</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Toplam {total} lead</span>
          <select
            value={limit}
            onChange={(e) => onFiltersChange({ ...filters, limit: Number(e.target.value), offset: 0 })}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>/ sayfa</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onFiltersChange({ ...filters, offset: (currentPage - 2) * limit })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-40"
          >
            Onceki
          </button>
          <span className="px-3 text-xs text-slate-500">{currentPage} / {totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onFiltersChange({ ...filters, offset: currentPage * limit })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
