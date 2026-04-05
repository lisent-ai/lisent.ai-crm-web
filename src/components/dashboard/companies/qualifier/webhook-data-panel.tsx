"use client";

import { useState, useEffect } from "react";
import {
  generateRAGToken,
  getRAGConfig,
  listWebhookData,
  getWebhookDataDetail,
  deleteWebhookData,
  CRMClientError,
  type RAGConfigResponse,
  type WebhookDataListItem,
} from "@/lib/crm/client";

type Props = {
  companyId: string;
};

export function WebhookDataPanel({ companyId }: Readonly<Props>) {
  const [config, setConfig] = useState<RAGConfigResponse | null>(null);
  const [entries, setEntries] = useState<WebhookDataListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Preview state
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPayload, setPreviewPayload] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    Promise.all([getRAGConfig(companyId), listWebhookData(companyId)])
      .then(([cfg, data]) => {
        setConfig(cfg);
        setEntries(data);
      })
      .catch(() => setError("Yapilandirma yuklenemedi"))
      .finally(() => setLoading(false));
  }, [companyId]);

  async function handleGenerate() {
    if (
      !confirm(
        "Yeni bir RAG webhook token uretilecek. Onceki token gecersiz olur. Devam edilsin mi?",
      )
    )
      return;
    setGenerating(true);
    setError("");
    try {
      const result = await generateRAGToken(companyId);
      setConfig({
        companyId: result.companyId,
        token: result.token,
        webhookUrl: result.webhookUrl,
      });
    } catch (err) {
      setError(
        err instanceof CRMClientError ? err.message : "Token uretilemedi.",
      );
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

  async function handlePreview(dataId: string) {
    if (previewId === dataId) {
      setPreviewId(null);
      setPreviewPayload(null);
      return;
    }
    setPreviewId(dataId);
    setPreviewLoading(true);
    try {
      const detail = await getWebhookDataDetail(companyId, dataId);
      setPreviewPayload(JSON.stringify(detail.payload, null, 2));
    } catch {
      setPreviewPayload("Veri yuklenemedi");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDelete(dataId: string) {
    if (!confirm("Bu webhook verisi silinecek. Devam edilsin mi?")) return;
    try {
      await deleteWebhookData(companyId, dataId);
      setEntries((prev) => prev.filter((e) => e.id !== dataId));
      if (previewId === dataId) {
        setPreviewId(null);
        setPreviewPayload(null);
      }
    } catch (err) {
      setError(
        err instanceof CRMClientError ? err.message : "Silinemedi.",
      );
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Yukleniyor...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Webhook URL Section */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-medium text-slate-500">RAG Webhook URL</p>

        {config?.webhookUrl ? (
          <>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {config.webhookUrl}
              </code>
              <button
                onClick={handleCopy}
                type="button"
                className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
              >
                {copied ? "Kopyalandi!" : "Kopyala"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Bu URL&apos;ye herhangi bir JSON POST istegi gonderin. Gelen veri
              AI bilgi bankasina eklenir.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400 italic">
            Henuz RAG webhook token uretilmedi.
          </p>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          type="button"
          className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#4c1d95)] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition hover:brightness-110 disabled:opacity-50"
        >
          {generating
            ? "Uretiliyor..."
            : config?.webhookUrl
              ? "Yeni Token Uret"
              : "Webhook Token Uret"}
        </button>
      </div>

      {/* Webhook Data List */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">
            Gelen Webhook Verileri ({entries.length})
          </p>
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-100 bg-white p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-700">
                      {entry.label || `Webhook #${entries.length - idx}`}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(entry.receivedAt)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatSize(entry.payloadSize)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(entry.id)}
                      type="button"
                      className="text-xs text-violet-600 hover:underline"
                    >
                      {previewId === entry.id ? "Kapat" : "Onizle"}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      type="button"
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                {previewId === entry.id && (
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 overflow-x-auto">
                    {previewLoading ? (
                      <p className="text-xs text-slate-400">Yukleniyor...</p>
                    ) : (
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                        {previewPayload}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && config?.webhookUrl && (
        <p className="text-xs text-slate-400 italic">
          Henuz webhook verisi gelmedi. Webhook URL&apos;ye JSON gondererek test
          edebilirsiniz.
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
