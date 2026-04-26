"use client";

import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  getQualifierRAGConfig,
  revokeQualifierRAGSecondaryToken,
  rotateQualifierRAGToken,
  type QualifierRAGConfig,
} from "@/lib/crm/client";
import {
  getRagDocument,
  listRagDocuments,
  type RagChunk,
  type RagDocument,
} from "@/lib/qualifier/client";

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
  const t = useTranslations();
  const [config, setConfig] = useState<QualifierRAGConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showPrimary, setShowPrimary] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [docs, setDocs] = useState<RagDocument[] | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chunkCache, setChunkCache] = useState<Record<string, RagChunk[]>>({});
  const [chunkLoading, setChunkLoading] = useState<string | null>(null);
  const [chunkError, setChunkError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await getQualifierRAGConfig(companyId);
      setConfig(next);
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : t("integrations.rag.loadConfigFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const next = await listRagDocuments(companyId);
      setDocs(next);
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : t("integrations.rag.loadDocsFailed"));
    } finally {
      setDocsLoading(false);
    }
  }, [companyId, t]);

  const toggleExpanded = useCallback(
    async (recordId: string) => {
      if (expanded === recordId) {
        setExpanded(null);
        return;
      }
      setExpanded(recordId);
      setChunkError(null);
      if (chunkCache[recordId]) return;
      setChunkLoading(recordId);
      try {
        const { chunks } = await getRagDocument(companyId, recordId);
        setChunkCache((prev) => ({ ...prev, [recordId]: chunks }));
      } catch (err) {
        setChunkError(err instanceof Error ? err.message : t("integrations.rag.loadContentFailed"));
      } finally {
        setChunkLoading(null);
      }
    },
    [companyId, expanded, chunkCache, t],
  );

  useEffect(() => {
    void load();
    void loadDocs();
  }, [load, loadDocs]);

  async function handleRotate() {
    if (!confirm(t("integrations.rag.rotateConfirm"))) {
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
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.rotateFailed"));
    } finally {
      setRotating(false);
    }
  }

  async function handleRevoke() {
    if (!confirm(t("integrations.rag.revokeConfirm"))) return;
    setRevoking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await revokeQualifierRAGSecondaryToken(companyId);
      setConfig((prev) => (prev ? { ...prev, tokenSecondary: null } : prev));
      setSuccessMessage(t("integrations.qualifier.secondaryRevoked"));
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.revokeFailed"));
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
    "data": [
      {
        "record_id": "policy-v1",
        "title": "Return policy",
        "content": "We offer...",
        "source_url": "https://example.com/policy"
      }
    ]
  }'`
    : "";

  if (loading) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)]">
        {t("integrations.rag.loading")}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {t("integrations.rag.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("integrations.rag.description")}
          </p>
        </header>

        {config?.webhookUrl ? (
          <div className="mb-4 grid gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("integrations.qualifier.webhookUrlLabel")}
              </span>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                  {config.webhookUrl}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    if (config.webhookUrl) {
                      void navigator.clipboard.writeText(config.webhookUrl);
                      setSuccessMessage(t("integrations.urlCopied"));
                    }
                  }}
                >
                  {t("integrations.copy")}
                </button>
              </div>
            </div>

            <TokenRow
              label={t("integrations.primary")}
              token={config.tokenPrimary}
              show={showPrimary}
              toggle={() => setShowPrimary((v) => !v)}
              mask={mask}
            />
            <TokenRow
              label={`${t("integrations.secondary")} ${t("integrations.rotationWindow")}`}
              token={config.tokenSecondary}
              show={showSecondary}
              toggle={() => setShowSecondary((v) => !v)}
              mask={mask}
            />
          </div>
        ) : (
          <p className="mb-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
            {t("integrations.rag.noToken")}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRotate}
            disabled={rotating}
            className="rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {rotating
              ? t("integrations.rotating")
              : config?.tokenPrimary
                ? t("integrations.rotateToken")
                : t("integrations.generateToken")}
          </button>
          {config?.tokenSecondary ? (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-5 py-2.5 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:opacity-50"
            >
              {revoking ? t("integrations.revoking") : t("integrations.revokeSecondary")}
            </button>
          ) : null}
        </div>
      </article>

      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <header className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              {t("integrations.rag.ingestedDocuments", { count: docs?.length ?? 0 })}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t.rich("integrations.rag.ingestedDescription", {
                code: (chunks) => (
                  <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">
                    {chunks}
                  </code>
                ),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={loadDocs}
            disabled={docsLoading}
            className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {docsLoading ? t("integrations.refreshing") : t("integrations.refresh")}
          </button>
        </header>
        {docsError ? (
          <p className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
            {docsError}
          </p>
        ) : docsLoading && !docs ? (
          <p className="text-sm text-[var(--text-tertiary)]">{t("integrations.rag.loadingDocs")}</p>
        ) : !docs || docs.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            {t("integrations.rag.noDocuments")}
          </p>
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-2xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                <tr>
                  <th className="w-6 px-3 py-2 font-semibold"></th>
                  <th className="px-3 py-2 font-semibold">record_id</th>
                  <th className="px-3 py-2 font-semibold">{t("integrations.rag.titleColumn")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("integrations.rag.chunksColumn")}</th>
                  <th className="px-3 py-2 font-semibold">{t("integrations.rag.updatedColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const isOpen = expanded === d.doc_ref;
                  const chunks = chunkCache[d.doc_ref];
                  return (
                    <Fragment key={d.doc_ref}>
                      <tr
                        className="cursor-pointer border-t border-[var(--border-subtle)] transition hover:bg-[var(--surface-muted)]"
                        onClick={() => void toggleExpanded(d.doc_ref)}
                      >
                        <td className="px-3 py-2 text-[var(--text-muted)]">{isOpen ? "▾" : "▸"}</td>
                        <td className="px-3 py-2 font-mono text-[var(--text-primary)]">{d.doc_ref}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{d.title || "—"}</td>
                        <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{d.chunk_count}</td>
                        <td className="px-3 py-2 text-[var(--text-tertiary)]">
                          {d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]">
                          <td colSpan={5} className="px-3 py-3">
                            {chunkLoading === d.doc_ref ? (
                              <p className="text-[var(--text-tertiary)]">{t("integrations.rag.loadingContent")}</p>
                            ) : chunkError && !chunks ? (
                              <p className="text-[var(--signal-red)]">{chunkError}</p>
                            ) : !chunks ? null : (
                              <div className="space-y-3">
                                {chunks.map((c) => (
                                  <div
                                    key={c.id}
                                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3"
                                  >
                                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                                      <span>{t("integrations.rag.chunkLabel", { index: c.chunk_index })}</span>
                                      {c.source_url ? (
                                        <a
                                          href={c.source_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[var(--accent-strong)] hover:underline"
                                        >
                                          {t("integrations.rag.sourceLink")}
                                        </a>
                                      ) : null}
                                    </div>
                                    <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-[var(--text-primary)]">
                                      {c.content}
                                    </pre>
                                    {Object.keys(c.metadata ?? {}).length > 0 ? (
                                      <details className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                                        <summary className="cursor-pointer">{t("integrations.rag.metadata")}</summary>
                                        <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--surface-inset)] p-2 font-mono text-[var(--text-secondary)]">
                                          {JSON.stringify(c.metadata, null, 2)}
                                        </pre>
                                      </details>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {config?.webhookUrl ? (
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            {t("integrations.rag.ingestionExampleTitle")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t.rich("integrations.rag.ingestionExampleDescription", {
              code: (chunks) => (
                <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">
                  {chunks}
                </code>
              ),
            })}
          </p>
          <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-[var(--text-primary)] p-4 font-mono text-xs leading-relaxed text-[var(--surface)]">
            {curlSnippet}
          </pre>
        </article>
      ) : null}

      {successMessage ? (
        <p className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
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
  const t = useTranslations();
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </span>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
          {token ? (show ? token : mask(token)) : "—"}
        </code>
        {token ? (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {show ? t("integrations.hide") : t("integrations.reveal")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
