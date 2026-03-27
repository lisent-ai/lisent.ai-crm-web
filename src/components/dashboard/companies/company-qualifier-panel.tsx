"use client";

import { useState, useEffect } from "react";
import {
  generateQualifierToken,
  getQualifierConfig,
  updateQualifierFallbackUrl,
  type QualifierConfigResponse,
  CRMClientError,
} from "@/lib/crm/client";

const QUALIFIER_BASE_URL = (
  process.env.NEXT_PUBLIC_AI_QUALIFIER_BASE_URL ?? "https://api.lisent.ai"
).replace(/\/+$/, "");

function buildWebhookUrl(token: string) {
  return `${QUALIFIER_BASE_URL}/webhook/lead/${token}`;
}

type Props = {
  companyId: string;
};

export function CompanyQualifierPanel({ companyId }: Readonly<Props>) {
  const [config, setConfig] = useState<QualifierConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Fallback URL editing
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [editingFallback, setEditingFallback] = useState(false);
  const [savingFallback, setSavingFallback] = useState(false);

  useEffect(() => {
    getQualifierConfig(companyId).then((cfg) => {
      const patched = cfg && cfg.token
        ? { ...cfg, webhookUrl: buildWebhookUrl(cfg.token) }
        : cfg;
      setConfig(patched);
      setFallbackUrl(patched?.fallbackUrl ?? "");
      setEditingFallback(!patched?.fallbackUrl);
      setLoading(false);
    });
  }, [companyId]);

  async function handleGenerate() {
    if (!confirm("Yeni bir webhook token üretilecek. Önceki token geçersiz olur. Devam edilsin mi?")) return;
    setGenerating(true);
    setError("");
    try {
      const result = await generateQualifierToken(companyId);
      setConfig((prev) => ({
        companyId: result.companyId,
        token: result.token,
        webhookUrl: buildWebhookUrl(result.token),
        fallbackUrl: prev?.fallbackUrl ?? null,
      }));
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Token üretilemedi.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!config?.webhookUrl) return;
    await navigator.clipboard.writeText(config.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveFallback() {
    setSavingFallback(true);
    setError("");
    try {
      await updateQualifierFallbackUrl(companyId, fallbackUrl);
      setConfig((prev) => prev ? { ...prev, fallbackUrl: fallbackUrl || null } : prev);
      setEditingFallback(false);
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Fallback URL kaydedilemedi.");
    } finally {
      setSavingFallback(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-5">
      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold text-slate-950">AI Lead Qualifier</p>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
          Webhook
        </span>
      </div>

      <p className="text-sm text-slate-500">
        Form ve reklam entegrasyonları için şirkete özel webhook URL üretin. Gelen lead verisi
        AI qualifier akışına yönlendirilir ve skorlanır.
      </p>

      {/* Webhook URL */}
      {config?.webhookUrl ? (
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Webhook URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {config.webhookUrl}
            </code>
            <button
              onClick={handleCopy}
              type="button"
              className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
            >
              {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Bu URL&apos;ye JSON POST isteği gönderin. Güvende tutun — URL&apos;yi bilen herkes lead gönderebilir.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">Henüz webhook token üretilmedi.</p>
      )}

      {/* Generate button */}
      <div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          type="button"
          className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#4c1d95)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition hover:brightness-110 disabled:opacity-50"
        >
          {generating ? "Üretiliyor..." : config?.webhookUrl ? "Yeni Token Üret" : "Webhook Token Üret"}
        </button>
      </div>

      {/* Fallback URL */}
      <div className="border-t border-slate-100 pt-5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Fallback Webhook URL</p>
          {!editingFallback && config?.fallbackUrl && (
            <button
              type="button"
              onClick={() => { setFallbackUrl(config.fallbackUrl ?? ""); setEditingFallback(true); }}
              className="text-xs text-violet-600 hover:underline"
            >
              Düzenle
            </button>
          )}
        </div>

        {editingFallback ? (
          <>
            <p className="text-xs text-slate-500">
              Qualify olan lead&apos;lar bu URL&apos;ye gönderilir. Boş bırakılırsa global CRM webhook URL&apos;si kullanılır.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
                placeholder="https://your-crm.com/api/leads"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                onClick={handleSaveFallback}
                disabled={savingFallback}
                type="button"
                className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-400 hover:text-violet-700 disabled:opacity-50"
              >
                {savingFallback ? "Kaydediliyor..." : "Kaydet"}
              </button>
              {config?.fallbackUrl && (
                <button
                  type="button"
                  onClick={() => { setFallbackUrl(config.fallbackUrl ?? ""); setEditingFallback(false); }}
                  className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
                >
                  İptal
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600 break-all">
            {config?.fallbackUrl ?? <span className="text-slate-400 italic">Ayarlanmadı</span>}
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}
