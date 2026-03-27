"use client";

import { useState, useEffect } from "react";
import {
  getGreenAPIIntegration,
  upsertGreenAPIIntegration,
  deleteGreenAPIIntegration,
  type GreenAPIIntegration,
  CRMClientError,
} from "@/lib/crm/client";

type Props = {
  companyId: string;
};

export function CompanyWhatsAppPanel({ companyId }: Readonly<Props>) {
  const [integration, setIntegration] = useState<GreenAPIIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [idInstance, setIdInstance] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getGreenAPIIntegration(companyId)
      .then(setIntegration)
      .catch(() => setIntegration(null))
      .finally(() => setLoading(false));
  }, [companyId]);

  async function handleSave() {
    if (!idInstance.trim() || !apiToken.trim()) return;
    setSaving(true);
    setError("");
    try {
      const result = await upsertGreenAPIIntegration(companyId, {
        idInstance: idInstance.trim(),
        apiTokenInstance: apiToken.trim(),
      });
      setIntegration(result);
      setShowForm(false);
      setIdInstance("");
      setApiToken("");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Bağlantı kurulamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("WhatsApp bağlantısını kesmek istediğinizden emin misiniz?")) return;
    setDisconnecting(true);
    setError("");
    try {
      await deleteGreenAPIIntegration(companyId);
      setIntegration(null);
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Bağlantı kesilemedi.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-400">WhatsApp durumu yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
      {/* Başlık ve durum badge */}
      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold text-slate-950">WhatsApp</p>
        {integration?.isActive ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Bağlı
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            Bağlı değil
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        GreenAPI üzerinden WhatsApp hesabınızı şirkete bağlayın. Gelen mesajlar AI lead
        qualifier akışına otomatik yönlendirilir.
      </p>

      {/* Bağlı ise bilgi göster */}
      {integration && !showForm && (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-28 shrink-0 font-medium text-slate-600">Instance ID</span>
            <span className="font-mono text-slate-800">{integration.idInstance}</span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="w-28 shrink-0 font-medium text-slate-600">API Token</span>
            <span className="font-mono text-slate-500">{integration.apiTokenMasked}</span>
          </div>
        </div>
      )}

      {/* Bağlı ise aksiyon butonları */}
      {integration && !showForm && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            type="button"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Güncelle
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            type="button"
            className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {disconnecting ? "Kesiliyor..." : "Bağlantıyı kes"}
          </button>
        </div>
      )}

      {/* Bağlı değil veya güncelleme formu */}
      {(!integration || showForm) && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Instance ID
            </label>
            <input
              type="text"
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              placeholder="Örn: 7103001234"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              API Token Instance
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="GreenAPI panel'den kopyalayın"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !idInstance.trim() || !apiToken.trim()}
              type="button"
              className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Bağlanıyor..." : "WhatsApp Bağla"}
            </button>
            {showForm && (
              <button
                onClick={() => {
                  setShowForm(false);
                  setError("");
                  setIdInstance("");
                  setApiToken("");
                }}
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
              >
                İptal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
