"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  getQualifierRAGConfig,
  revokeQualifierRAGSecondaryToken,
  rotateQualifierRAGToken,
  type QualifierRAGConfig,
} from "@/lib/crm/client";

type Props = {
  companyId: string;
};

/**
 * Owner-only RAG webhook config surface. Manages the per-company token pair
 * that authenticates document uploads into the AI Lead Qualifier, shows the
 * copy-ready webhook URL + a curl snippet, and offers a dual-active rotation
 * + revoke flow. Document ingestion happens by POST from the integrator's
 * side into the AI Qualifier service directly (outside this BFF).
 */
export function QualifierRAGConfigPanel({ companyId }: Readonly<Props>) {
  const [config, setConfig] = useState<QualifierRAGConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showPrimary, setShowPrimary] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await getQualifierRAGConfig(companyId);
      setConfig(next);
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : "Could not load RAG config",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRotate() {
    if (!confirm("Rotate the RAG token? The previous token stays valid as secondary until you revoke it.")) {
      return;
    }
    setRotating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await rotateQualifierRAGToken(companyId);
      setConfig({
        companyId: result.companyId,
        tokenPrimary: result.tokenPrimary,
        tokenSecondary: result.tokenSecondary,
        webhookUrl: result.webhookUrl,
      });
      setSuccessMessage(result.rotationNotice);
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Rotate failed");
    } finally {
      setRotating(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Revoke the secondary RAG token?")) return;
    setRevoking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await revokeQualifierRAGSecondaryToken(companyId);
      setConfig((prev) => (prev ? { ...prev, tokenSecondary: null } : prev));
      setSuccessMessage("Secondary token revoked.");
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Revoke failed");
    } finally {
      setRevoking(false);
    }
  }

  function mask(token: string | null | undefined) {
    if (!token) return "—";
    if (token.length <= 12) return token;
    return token.slice(0, 8) + "…" + token.slice(-4);
  }

  const curlSnippet = config?.webhookUrl
    ? `curl -X POST "${config.webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Idempotency-Key: $(uuidgen)" \\
  -d '{
    "documents": [
      {
        "doc_ref": "policy-v1",
        "title": "Return policy",
        "content": "We offer...",
        "source_url": "https://example.com/policy"
      }
    ]
  }'`
    : "";

  if (loading) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading RAG config…
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            RAG webhook + token rotation
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            POST knowledge base documents here; the AI chat grounds its answers
            on them. Dual-active rotation lets you roll the token without
            dropping uploads mid-flight.
          </p>
        </header>

        {config?.webhookUrl ? (
          <div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Webhook URL
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs text-slate-800">
                  {config.webhookUrl}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => {
                    if (config.webhookUrl) {
                      void navigator.clipboard.writeText(config.webhookUrl);
                      setSuccessMessage("URL copied");
                    }
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <TokenRow
              label="Primary"
              token={config.tokenPrimary}
              show={showPrimary}
              toggle={() => setShowPrimary((v) => !v)}
              mask={mask}
            />
            <TokenRow
              label="Secondary (rotation window)"
              token={config.tokenSecondary}
              show={showSecondary}
              toggle={() => setShowSecondary((v) => !v)}
              mask={mask}
            />
          </div>
        ) : (
          <p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            No RAG token yet. Generate one below to enable document uploads.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRotate}
            disabled={rotating}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {rotating ? "Rotating…" : config?.tokenPrimary ? "Rotate token" : "Generate token"}
          </button>
          {config?.tokenSecondary ? (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              className="rounded-full border border-rose-300 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {revoking ? "Revoking…" : "Revoke secondary"}
            </button>
          ) : null}
        </div>
      </article>

      {config?.webhookUrl ? (
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold tracking-tight text-slate-950">
            Ingestion example
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Send documents directly to the webhook. Re-posting with the same{" "}
            <code>doc_ref</code> replaces the earlier content (idempotent).
          </p>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
            {curlSnippet}
          </pre>
        </article>
      ) : null}

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function TokenRow({
  label,
  token,
  show,
  toggle,
  mask,
}: {
  label: string;
  token: string | null;
  show: boolean;
  toggle: () => void;
  mask: (t: string | null | undefined) => string;
}) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-mono text-slate-800">
          {token ? (show ? token : mask(token)) : "—"}
        </code>
        {token ? (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {show ? "Hide" : "Reveal"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
