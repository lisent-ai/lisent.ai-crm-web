"use client";

import { useState } from "react";
import { updateLeadStatus } from "@/lib/qualifier/client";

type Props = {
  companyId: string;
  leadId: string;
  currentStatus: string;
  onStatusChanged: (newStatus: string) => void;
};

const TRANSITIONS: Record<string, { label: string; color: string }[]> = {
  new: [
    { label: "contacted", color: "bg-blue-600" },
    { label: "qualifying", color: "bg-amber-600" },
    { label: "qualified", color: "bg-emerald-600" },
    { label: "lost", color: "bg-rose-600" },
  ],
  contacted: [
    { label: "new", color: "bg-slate-500" },
    { label: "qualifying", color: "bg-amber-600" },
    { label: "qualified", color: "bg-emerald-600" },
    { label: "lost", color: "bg-rose-600" },
  ],
  qualifying: [
    { label: "contacted", color: "bg-blue-600" },
    { label: "qualified", color: "bg-emerald-600" },
    { label: "lost", color: "bg-rose-600" },
  ],
  qualified: [
    { label: "qualifying", color: "bg-amber-600" },
    { label: "negotiation", color: "bg-violet-600" },
    { label: "won", color: "bg-emerald-600" },
    { label: "lost", color: "bg-rose-600" },
  ],
  negotiation: [
    { label: "qualified", color: "bg-emerald-600" },
    { label: "won", color: "bg-emerald-600" },
    { label: "lost", color: "bg-rose-600" },
  ],
  won: [
    { label: "negotiation", color: "bg-violet-600" },
    { label: "archived", color: "bg-slate-500" },
  ],
  lost: [
    { label: "new", color: "bg-slate-600" },
    { label: "qualifying", color: "bg-amber-600" },
  ],
  archived: [
    { label: "new", color: "bg-slate-600" },
    { label: "qualifying", color: "bg-amber-600" },
  ],
};

const STATUS_LABEL: Record<string, string> = {
  new: "Yeni",
  contacted: "Iletisime Gecildi",
  qualifying: "Degerlendiriliyor",
  qualified: "Kalifiye",
  negotiation: "Muzakere",
  won: "Kazanildi",
  lost: "Kaybedildi",
  archived: "Arsivlendi",
};

export function QualifierStatusActions({ companyId, leadId, currentStatus, onStatusChanged }: Readonly<Props>) {
  const [showModal, setShowModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const available = TRANSITIONS[currentStatus] ?? [];

  async function handleConfirm() {
    if (!selectedStatus) return;
    setSubmitting(true);
    setError("");
    try {
      await updateLeadStatus(companyId, leadId, selectedStatus, reason);
      onStatusChanged(selectedStatus);
      setShowModal(false);
      setSelectedStatus("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum degistirilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  if (available.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Durumu degistir:</span>
        {available.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => { setSelectedStatus(t.label); setShowModal(true); }}
            className={`rounded-full ${t.color} px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110`}
          >
            {STATUS_LABEL[t.label] ?? t.label}
          </button>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 animate-[fadeIn_0.15s_ease-out]">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">Durumu Degistir</h3>
            <p className="text-sm text-slate-600">
              <span className="font-medium">{STATUS_LABEL[currentStatus] ?? currentStatus}</span>
              {" → "}
              <span className="font-medium">{STATUS_LABEL[selectedStatus] ?? selectedStatus}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Neden (opsiyonel)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Neden bu degisiklik yapiliyor?"
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none resize-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setReason(""); setError(""); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? "Kaydediliyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
