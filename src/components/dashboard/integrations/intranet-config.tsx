"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  disconnectIntranetIntegration,
  getIntranetConfig,
  type IntranetAuthMode,
  type IntranetConfig,
  type IntranetDelivery,
  listIntranetDeliveries,
  patchIntranetIntegration,
  revokeIntranetSecondaryBearer,
  revokeIntranetSecondarySecret,
  revokeIntranetSecondaryToken,
  rotateIntranetBearer,
  rotateIntranetSecret,
  rotateIntranetToken,
  upsertIntranetIntegration,
} from "@/lib/crm/client";

type Props = {
  companyId: string;
};

const DEFAULT_FIELD_MAPPING = JSON.stringify(
  {
    name: "payload.full_name",
    email: "payload.contact.email",
    phone: "payload.contact.phone",
    source: "'intranet'",
    notes: "payload.note",
    extra_data: {
      employee_id: "payload.employee_id",
      department: "payload.department",
    },
  },
  null,
  2,
);

/**
 * Owner-only Intranet integration surface. Creates the inbound webhook on
 * first save, reveals the HMAC secret once, then shows masked values +
 * rotation controls. Delivery history + counters help diagnose signing
 * issues without pulling server logs.
 */
export function IntranetConfigPanel({ companyId }: Readonly<Props>) {
  const t = useTranslations();
  const [config, setConfig] = useState<IntranetConfig | null>(null);
  const [deliveries, setDeliveries] = useState<IntranetDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revealedBearer, setRevealedBearer] = useState<string | null>(null);

  const [mappingText, setMappingText] = useState(DEFAULT_FIELD_MAPPING);
  const [targetEntity, setTargetEntity] = useState<"lead" | "customer">("lead");
  const [authMode, setAuthMode] = useState<IntranetAuthMode>("hmac_or_bearer");
  const [mappingError, setMappingError] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshDeliveries = useCallback(async () => {
    try {
      const rows = await listIntranetDeliveries(companyId);
      setDeliveries(rows);
    } catch {
      /* ignore — deliveries are best-effort */
    }
  }, [companyId]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await getIntranetConfig(companyId);
      setConfig(next);
      if (next) {
        setMappingText(JSON.stringify(next.fieldMapping, null, 2));
        setTargetEntity(next.targetEntity);
        setAuthMode(next.authMode);
      }
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.intranet.loadFailed"));
    } finally {
      setLoading(false);
    }
    await refreshDeliveries();
  }, [companyId, refreshDeliveries, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function parseMapping(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(mappingText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setMappingError(null);
        return parsed as Record<string, unknown>;
      }
      setMappingError(t("integrations.intranet.mappingMustBeObject"));
      return null;
    } catch (err) {
      setMappingError(err instanceof Error ? err.message : t("integrations.intranet.invalidJson"));
      return null;
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const mapping = parseMapping();
    if (!mapping) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (config) {
        const next = await patchIntranetIntegration(companyId, {
          fieldMapping: mapping,
          targetEntity,
          authMode,
        });
        setConfig(next);
        setSuccessMessage(t("integrations.intranet.saved"));
      } else {
        const result = await upsertIntranetIntegration(companyId, {
          fieldMapping: mapping,
          targetEntity,
          authMode,
        });
        setConfig(result.integration);
        if (result.hmacSecretPlain) setRevealedSecret(result.hmacSecretPlain);
        if (result.bearerTokenPlain) setRevealedBearer(result.bearerTokenPlain);
        setSuccessMessage(t("integrations.intranet.createdMessage"));
      }
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRotateToken() {
    if (!confirm(t("integrations.intranet.rotateTokenConfirm"))) return;
    setRotating(true);
    setErrorMessage(null);
    try {
      const r = await rotateIntranetToken(companyId);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              inboundUrl: r.inboundUrl,
              tokenPrimary: r.tokenPrimary,
              tokenSecondary: r.tokenSecondary,
            }
          : prev,
      );
      setSuccessMessage(r.rotationNotice);
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.rotateFailed"));
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeToken() {
    if (!confirm(t("integrations.intranet.revokeSecondaryTokenConfirm"))) return;
    setErrorMessage(null);
    try {
      await revokeIntranetSecondaryToken(companyId);
      setConfig((prev) => (prev ? { ...prev, tokenSecondary: null } : prev));
      setSuccessMessage(t("integrations.intranet.secondaryTokenRevoked"));
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.revokeFailed"));
    }
  }

  async function handleRotateSecret() {
    if (!confirm(t("integrations.intranet.rotateSecretConfirm"))) return;
    setRotating(true);
    setErrorMessage(null);
    try {
      const r = await rotateIntranetSecret(companyId);
      setRevealedSecret(r.hmacSecretPrimary);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              hmacSecretPrimaryMasked: maskSecret(r.hmacSecretPrimary),
              hmacSecretSecondaryMasked: r.secondaryMasked,
            }
          : prev,
      );
      setSuccessMessage(r.rotationNotice);
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.rotateFailed"));
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeSecret() {
    if (!confirm(t("integrations.intranet.revokeSecretConfirm"))) return;
    setErrorMessage(null);
    try {
      await revokeIntranetSecondarySecret(companyId);
      setConfig((prev) => (prev ? { ...prev, hmacSecretSecondaryMasked: null } : prev));
      setSuccessMessage(t("integrations.intranet.secondarySecretRevoked"));
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.revokeFailed"));
    }
  }

  async function handleRotateBearer() {
    if (!confirm(t("integrations.intranet.rotateBearerConfirm"))) return;
    setRotating(true);
    setErrorMessage(null);
    try {
      const r = await rotateIntranetBearer(companyId);
      setRevealedBearer(r.bearerTokenPrimary);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              bearerTokenPrimaryMasked: maskSecret(r.bearerTokenPrimary),
              bearerTokenSecondaryMasked: r.secondaryMasked || null,
            }
          : prev,
      );
      setSuccessMessage(r.rotationNotice);
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.rotateFailed"));
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeBearer() {
    if (!confirm(t("integrations.intranet.revokeBearerConfirm"))) return;
    setErrorMessage(null);
    try {
      await revokeIntranetSecondaryBearer(companyId);
      setConfig((prev) => (prev ? { ...prev, bearerTokenSecondaryMasked: null } : prev));
      setSuccessMessage(t("integrations.intranet.secondaryBearerRevoked"));
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.revokeFailed"));
    }
  }

  async function handleDisconnect() {
    if (!confirm(t("integrations.intranet.disconnectConfirm"))) return;
    setErrorMessage(null);
    try {
      await disconnectIntranetIntegration(companyId);
      setConfig(null);
      setSuccessMessage(t("integrations.disconnected"));
      setRevealedSecret(null);
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : t("integrations.errors.disconnectFailed"));
    }
  }

  function maskSecret(secret: string | null) {
    if (!secret || secret.length <= 4) return "••••";
    return "••••••••" + secret.slice(-4);
  }

  const hmacSnippet = config
    ? `SECRET="your-hmac-secret"
BODY='{"event":"lead.created","payload":{"full_name":"Ali Veli","contact":{"email":"a@x.com","phone":"+905551112233"},"department":"sales"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -X POST "${config.inboundUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Intranet-Signature: sha256=$SIG" \\
  -H "X-Idempotency-Key: $(uuidgen)" \\
  -d "$BODY"`
    : "";

  const bearerSnippet = config
    ? `TOKEN="your-bearer-token"
curl -X POST "${config.inboundUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Idempotency-Key: $(uuidgen)" \\
  -d '{"event":"lead.created","payload":{"full_name":"Ali Veli","contact":{"email":"a@x.com","phone":"+905551112233"}}}'`
    : "";

  const showHmacSnippet = config?.authMode === "hmac" || config?.authMode === "hmac_or_bearer";
  const showBearerSnippet = config?.authMode === "bearer" || config?.authMode === "hmac_or_bearer";

  if (loading) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)]">
        {t("integrations.intranet.loading")}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Inbound URL — most important: needed to test or paste into ERP. */}
      {config ? (
        <article className="rounded-3xl border border-[color-mix(in_srgb,_var(--accent)_20%,_transparent)] bg-[var(--accent-soft)] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                {t("integrations.intranet.inboundUrl")}
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
                {t("integrations.intranet.sendPayloads")}
              </h2>
            </div>
            <span
              className={`shrink-0 self-start rounded-full border px-3 py-1 text-[11px] font-semibold ${
                config.isActive
                  ? "border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] text-[var(--signal-green)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-tertiary)]"
              }`}
            >
              {config.isActive ? t("integrations.intranet.active") : t("integrations.intranet.inactive")}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
              {config.inboundUrl}
            </code>
            <button
              type="button"
              className="shrink-0 rounded-full border border-[color-mix(in_srgb,_var(--accent)_30%,_transparent)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
              onClick={() => {
                void navigator.clipboard.writeText(config.inboundUrl);
                setSuccessMessage(t("integrations.intranet.urlCopied"));
              }}
            >
              {t("integrations.intranet.copyUrl")}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            {t.rich("integrations.intranet.inboundDescription", {
              code: (chunks) => (
                <code className="rounded bg-[var(--surface)] px-1 font-mono text-[var(--text-primary)]">
                  {chunks}
                </code>
              ),
            })}
          </p>
        </article>
      ) : (
        <article className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface)] p-5 text-sm text-[var(--text-secondary)] sm:p-6">
          {t("integrations.intranet.noIntegration")}
        </article>
      )}

      {/* Configuration summary */}
      {config ? (
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
              {t("integrations.intranet.configurationTitle")}
            </h2>
          </header>
          <dl className="grid gap-3 sm:grid-cols-2">
            <KV label={t("integrations.intranet.authMode")} value={authModeLabel(t, config.authMode)} />
            <KV label={t("integrations.intranet.target")} value={config.targetEntity} />
            <KV
              label={t("integrations.intranet.deliveries")}
              value={t("integrations.intranet.deliveriesValue", {
                ok: config.deliveryCountSuccess,
                fail: config.deliveryCountFailed,
                total: config.deliveryCountTotal,
              })}
            />
            <KV
              label={t("integrations.intranet.lastDelivery")}
              value={
                config.lastDeliveryAt
                  ? `${config.lastDeliveryStatus ?? t("integrations.intranet.unknown")} · ${new Date(config.lastDeliveryAt).toLocaleString()}`
                  : "—"
              }
            />
          </dl>
        </article>
      ) : null}

      {/* Credentials — split into focused cards instead of one big strip. */}
      {config ? (
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
              {t("integrations.intranet.credentialsTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t.rich("integrations.intranet.credentialsDescription", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </p>
          </header>
          <div className="grid gap-3">
            <CredentialBlock
              label={t("integrations.intranet.inboundToken")}
              hint={t("integrations.intranet.inboundTokenHint")}
              primary={config.tokenPrimary}
              secondary={config.tokenSecondary}
              rotateLabel={
                config.tokenPrimary
                  ? t("integrations.intranet.rotateToken")
                  : t("integrations.intranet.generateToken")
              }
              onRotate={handleRotateToken}
              onRevoke={handleRevokeToken}
              rotating={rotating}
              mono
            />
            <CredentialBlock
              label={t("integrations.intranet.hmacSecret")}
              hint={t("integrations.intranet.hmacSecretHint")}
              primary={config.hmacSecretPrimaryMasked}
              secondary={config.hmacSecretSecondaryMasked}
              rotateLabel={
                config.hmacSecretPrimaryMasked
                  ? t("integrations.intranet.rotateHmac")
                  : t("integrations.intranet.generateHmac")
              }
              onRotate={handleRotateSecret}
              onRevoke={handleRevokeSecret}
              rotating={rotating}
              mono
            />
            <CredentialBlock
              label={t("integrations.intranet.bearerToken")}
              hint={t("integrations.intranet.bearerTokenHint")}
              primary={config.bearerTokenPrimaryMasked}
              secondary={config.bearerTokenSecondaryMasked}
              rotateLabel={
                config.bearerTokenPrimaryMasked
                  ? t("integrations.intranet.rotateBearer")
                  : t("integrations.intranet.mintBearer")
              }
              onRotate={handleRotateBearer}
              onRevoke={handleRevokeBearer}
              rotating={rotating}
              mono
            />
          </div>
        </article>
      ) : null}

      {revealedSecret ? (
        <RevealPanel
          label={t("integrations.intranet.revealedHmacLabel")}
          value={revealedSecret}
          copyLabel={t("integrations.copy")}
          dismissLabel={t("integrations.intranet.dismiss")}
          description={t("integrations.intranet.revealDescription")}
          onCopyMessage={() => setSuccessMessage(t("integrations.intranet.hmacCopied"))}
          onDismiss={() => setRevealedSecret(null)}
        />
      ) : null}
      {revealedBearer ? (
        <RevealPanel
          label={t("integrations.intranet.revealedBearerLabel")}
          value={revealedBearer}
          copyLabel={t("integrations.copy")}
          dismissLabel={t("integrations.intranet.dismiss")}
          description={t("integrations.intranet.revealDescription")}
          onCopyMessage={() => setSuccessMessage(t("integrations.intranet.bearerCopied"))}
          onDismiss={() => setRevealedBearer(null)}
        />
      ) : null}

      {/* Field mapping editor */}
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
            {t("integrations.intranet.fieldMappingTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t.rich("integrations.intranet.fieldMappingDescription", {
              code: (chunks) => (
                <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">
                  {chunks}
                </code>
              ),
            })}
          </p>
        </header>

        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--text-secondary)]">{t("integrations.intranet.targetEntity")}</span>
              <select
                value={targetEntity}
                onChange={(e) => setTargetEntity(e.target.value as "lead" | "customer")}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm capitalize text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="lead">lead</option>
                <option value="customer">customer</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--text-secondary)]">{t("integrations.intranet.authMode")}</span>
              <select
                value={authMode}
                onChange={(e) => setAuthMode(e.target.value as IntranetAuthMode)}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="hmac_or_bearer">{t("integrations.intranet.authHmacOrBearer")}</option>
                <option value="bearer">{t("integrations.intranet.authBearer")}</option>
                <option value="hmac">{t("integrations.intranet.authHmac")}</option>
              </select>
              <span className="text-xs text-[var(--text-tertiary)]">
                {t.rich("integrations.intranet.authModeHint", {
                  code: (chunks) => (
                    <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">
                      {chunks}
                    </code>
                  ),
                })}
              </span>
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-[var(--text-secondary)]">
              {t("integrations.intranet.fieldMappingLabel")}
            </span>
            <textarea
              value={mappingText}
              onChange={(e) => setMappingText(e.target.value)}
              rows={12}
              spellCheck={false}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--text-primary)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--surface)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
            {mappingError ? (
              <span className="text-xs text-[var(--signal-red)]">{mappingError}</span>
            ) : null}
          </label>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? t("common.saving")
                : config
                  ? t("integrations.intranet.saveMapping")
                  : t("integrations.intranet.createIntegration")}
            </button>
          </div>
        </form>
      </article>

      {/* Curl snippets */}
      {config ? (
        <article className="grid gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
          <header>
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
              {t("integrations.intranet.requestExamples")}
            </h2>
          </header>
          {showBearerSnippet ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("integrations.intranet.bearerExampleTitle")}
              </span>
              <pre className="max-h-80 overflow-auto rounded-2xl bg-[var(--text-primary)] p-4 font-mono text-xs leading-relaxed text-[var(--surface)]">
                {bearerSnippet}
              </pre>
            </div>
          ) : null}
          {showHmacSnippet ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("integrations.intranet.hmacExampleTitle")}
              </span>
              <pre className="max-h-80 overflow-auto rounded-2xl bg-[var(--text-primary)] p-4 font-mono text-xs leading-relaxed text-[var(--surface)]">
                {hmacSnippet}
              </pre>
            </div>
          ) : null}
        </article>
      ) : null}

      {/* Delivery history */}
      {config ? (
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
          <header className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
              {t("integrations.intranet.recentDeliveries")}
            </h2>
            <button
              type="button"
              className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              onClick={() => void refreshDeliveries()}
            >
              {t("integrations.refresh")}
            </button>
          </header>
          {deliveries.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">{t("integrations.intranet.noDeliveries")}</p>
          ) : (
            <ul className="grid gap-2">
              {deliveries.map((d) => (
                <li
                  key={d.id}
                  className="grid gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold capitalize text-[var(--text-primary)]">
                      {d.status}
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      {new Date(d.createdAt).toLocaleString()}
                    </span>
                  </span>
                  {d.eventType ? (
                    <span className="text-[var(--text-secondary)]">{t("integrations.intranet.eventLabel")}: {d.eventType}</span>
                  ) : null}
                  {d.mappedEntityId ? (
                    <span className="break-all font-mono text-[var(--text-secondary)]">
                      {t("integrations.intranet.entityLabel")}: {d.mappedEntityId}
                    </span>
                  ) : null}
                  {d.errorMessage ? (
                    <span className="break-words text-[var(--signal-red)]">
                      {t("integrations.intranet.errorLabel")}: {d.errorMessage}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {/* Danger zone — disconnect lives alone, far from rotate controls. */}
      {config ? (
        <article className="rounded-3xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_6%,_var(--surface))] p-5 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-[var(--signal-red)] sm:text-lg">
                {t("integrations.disconnect")}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("integrations.intranet.disconnectDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="shrink-0 rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_10%,_var(--surface))]"
            >
              {t("integrations.intranet.disconnectIntegration")}
            </button>
          </div>
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

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-[var(--text-primary)] ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function CredentialBlock({
  label,
  hint,
  primary,
  secondary,
  rotateLabel,
  onRotate,
  onRevoke,
  rotating,
  mono,
}: Readonly<{
  label: string;
  hint: string;
  primary: string | null;
  secondary: string | null;
  rotateLabel: string;
  onRotate: () => void;
  onRevoke: () => void;
  rotating: boolean;
  mono?: boolean;
}>) {
  const t = useTranslations();
  const valueClass = `mt-1 break-all text-[var(--text-primary)] ${mono ? "font-mono text-xs" : "text-sm"}`;
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={onRotate}
            disabled={rotating}
            className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {rotating ? t("integrations.working") : rotateLabel}
          </button>
          {secondary ? (
            <button
              type="button"
              onClick={onRevoke}
              className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-3 py-1.5 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
            >
              {t("integrations.revokeSecondary")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("integrations.primary")}
          </span>
          <div className={valueClass}>{primary || "—"}</div>
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("integrations.secondary")} <span className="font-normal text-[var(--text-muted)]">{t("integrations.rotationWindow")}</span>
          </span>
          <div className={valueClass}>{secondary || "—"}</div>
        </div>
      </div>
    </section>
  );
}

function authModeLabel(t: ReturnType<typeof useTranslations>, mode: IntranetAuthMode): string {
  switch (mode) {
    case "hmac":
      return t("integrations.intranet.authHmacShort" as never);
    case "bearer":
      return t("integrations.intranet.authBearerShort" as never);
    case "hmac_or_bearer":
      return t("integrations.intranet.authBothShort" as never);
  }
}

function RevealPanel({
  label,
  value,
  copyLabel,
  dismissLabel,
  description,
  onCopyMessage,
  onDismiss,
}: {
  label: string;
  value: string;
  copyLabel: string;
  dismissLabel: string;
  description: string;
  onCopyMessage: () => void;
  onDismiss: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[color-mix(in_srgb,_var(--signal-amber)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] p-5 sm:p-6">
      <h3 className="text-sm font-semibold tracking-tight text-[var(--signal-amber)]">{label}</h3>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{description}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
          {value}
        </code>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(value);
              onCopyMessage();
            }}
            className="rounded-full border border-[color-mix(in_srgb,_var(--signal-amber)_40%,_transparent)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-amber)] transition hover:bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))]"
          >
            {copyLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-[color-mix(in_srgb,_var(--signal-amber)_40%,_transparent)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-amber)] transition hover:bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))]"
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
