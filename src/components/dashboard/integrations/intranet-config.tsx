"use client";

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
      setErrorMessage(err instanceof CRMClientError ? err.message : "Could not load config");
    } finally {
      setLoading(false);
    }
    await refreshDeliveries();
  }, [companyId, refreshDeliveries]);

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
      setMappingError("field_mapping must be a JSON object");
      return null;
    } catch (err) {
      setMappingError(err instanceof Error ? err.message : "invalid JSON");
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
        setSuccessMessage("Saved.");
      } else {
        const result = await upsertIntranetIntegration(companyId, {
          fieldMapping: mapping,
          targetEntity,
          authMode,
        });
        setConfig(result.integration);
        if (result.hmacSecretPlain) setRevealedSecret(result.hmacSecretPlain);
        if (result.bearerTokenPlain) setRevealedBearer(result.bearerTokenPlain);
        setSuccessMessage(
          "Integration created. Copy the HMAC secret and bearer token now — they won't be shown again.",
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRotateToken() {
    if (!confirm("Rotate inbound token?")) return;
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
      setErrorMessage(err instanceof CRMClientError ? err.message : "Rotate failed");
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeToken() {
    if (!confirm("Revoke secondary token?")) return;
    setErrorMessage(null);
    try {
      await revokeIntranetSecondaryToken(companyId);
      setConfig((prev) => (prev ? { ...prev, tokenSecondary: null } : prev));
      setSuccessMessage("Secondary token revoked.");
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Revoke failed");
    }
  }

  async function handleRotateSecret() {
    if (!confirm("Rotate HMAC secret? A new one will be revealed once and the old one becomes secondary.")) return;
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
      setErrorMessage(err instanceof CRMClientError ? err.message : "Rotate failed");
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeSecret() {
    if (!confirm("Revoke secondary HMAC secret?")) return;
    setErrorMessage(null);
    try {
      await revokeIntranetSecondarySecret(companyId);
      setConfig((prev) => (prev ? { ...prev, hmacSecretSecondaryMasked: null } : prev));
      setSuccessMessage("Secondary HMAC secret revoked.");
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Revoke failed");
    }
  }

  async function handleRotateBearer() {
    if (!confirm("Rotate bearer token? A new one will be revealed once and the old one becomes secondary.")) return;
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
      setErrorMessage(err instanceof CRMClientError ? err.message : "Rotate failed");
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeBearer() {
    if (!confirm("Revoke secondary bearer token?")) return;
    setErrorMessage(null);
    try {
      await revokeIntranetSecondaryBearer(companyId);
      setConfig((prev) => (prev ? { ...prev, bearerTokenSecondaryMasked: null } : prev));
      setSuccessMessage("Secondary bearer token revoked.");
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Revoke failed");
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect the Intranet integration? All tokens will stop working.")) return;
    setErrorMessage(null);
    try {
      await disconnectIntranetIntegration(companyId);
      setConfig(null);
      setSuccessMessage("Disconnected.");
      setRevealedSecret(null);
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Disconnect failed");
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
        Loading intranet config…
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Status + rotation */}
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Inbound webhook + rotation
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            HMAC-signed or Bearer-token; dual-active rotation. 1 MiB body cap.
            Idempotency via{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">X-Idempotency-Key</code>.
          </p>
        </header>

        {config ? (
          <div className="grid gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Inbound URL
              </span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                  {config.inboundUrl}
                </code>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    void navigator.clipboard.writeText(config.inboundUrl);
                    setSuccessMessage("URL copied");
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <KV label="Auth mode" value={authModeLabel(config.authMode)} />
              <KV label="Target" value={config.targetEntity} />
              <KV label="Token primary" value={config.tokenPrimary} mono />
              <KV label="Token secondary" value={config.tokenSecondary ?? "—"} mono />
              <KV label="HMAC primary" value={config.hmacSecretPrimaryMasked} mono />
              <KV
                label="HMAC secondary"
                value={config.hmacSecretSecondaryMasked ?? "—"}
                mono
              />
              <KV
                label="Bearer primary"
                value={config.bearerTokenPrimaryMasked ?? "—"}
                mono
              />
              <KV
                label="Bearer secondary"
                value={config.bearerTokenSecondaryMasked ?? "—"}
                mono
              />
              <KV label="Active" value={config.isActive ? "yes" : "no"} />
              <KV
                label="Deliveries"
                value={`${config.deliveryCountSuccess} ok / ${config.deliveryCountFailed} fail / ${config.deliveryCountTotal} total`}
              />
              <KV
                label="Last delivery"
                value={
                  config.lastDeliveryAt
                    ? `${config.lastDeliveryStatus ?? "unknown"} at ${new Date(config.lastDeliveryAt).toLocaleString()}`
                    : "—"
                }
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleRotateToken}
                disabled={rotating}
                className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Rotate token
              </button>
              {config.tokenSecondary ? (
                <button
                  type="button"
                  onClick={handleRevokeToken}
                  className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
                >
                  Revoke secondary token
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleRotateSecret}
                disabled={rotating}
                className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Rotate HMAC secret
              </button>
              {config.hmacSecretSecondaryMasked ? (
                <button
                  type="button"
                  onClick={handleRevokeSecret}
                  className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
                >
                  Revoke secondary HMAC
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleRotateBearer}
                disabled={rotating}
                className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {config.bearerTokenPrimaryMasked ? "Rotate bearer token" : "Mint bearer token"}
              </button>
              {config.bearerTokenSecondaryMasked ? (
                <button
                  type="button"
                  onClick={handleRevokeBearer}
                  className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
                >
                  Revoke secondary bearer
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDisconnect}
                className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))]"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-secondary)]">
            No integration yet. Configure the field mapping below and save to
            create the webhook.
          </p>
        )}
      </article>

      {revealedSecret ? (
        <RevealPanel
          label="New HMAC secret (shown only once)"
          value={revealedSecret}
          onCopyMessage={() => setSuccessMessage("HMAC secret copied")}
          onDismiss={() => setRevealedSecret(null)}
        />
      ) : null}
      {revealedBearer ? (
        <RevealPanel
          label="New bearer token (shown only once)"
          value={revealedBearer}
          onCopyMessage={() => setSuccessMessage("Bearer token copied")}
          onDismiss={() => setRevealedBearer(null)}
        />
      ) : null}

      {/* Field mapping editor */}
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Field mapping
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            JMESPath expressions evaluated against{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">{`{event, payload}`}</code>.
            Nested{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">extra_data</code>{" "}
            is supported. Leave the editor empty (
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">{"{}"}</code>) to
            let the Groq LLM auto-suggest a mapping from the first incoming payload.
          </p>
        </header>

        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--text-secondary)]">Target entity</span>
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
              <span className="font-semibold text-[var(--text-secondary)]">Auth mode</span>
              <select
                value={authMode}
                onChange={(e) => setAuthMode(e.target.value as IntranetAuthMode)}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value="hmac_or_bearer">HMAC or Bearer (both accepted)</option>
                <option value="bearer">Bearer only (static header)</option>
                <option value="hmac">HMAC only (body signature)</option>
              </select>
              <span className="text-xs text-[var(--text-tertiary)]">
                Bearer = paste a static{" "}
                <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">Authorization: Bearer …</code>{" "}
                header. HMAC = compute{" "}
                <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">sha256(secret, body)</code>{" "}
                per request.
              </span>
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-[var(--text-secondary)]">
              field_mapping (JSON)
            </span>
            <textarea
              value={mappingText}
              onChange={(e) => setMappingText(e.target.value)}
              rows={12}
              spellCheck={false}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--text-primary)] px-3 py-2 font-mono text-xs text-[var(--surface)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
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
              {saving ? "Saving…" : config ? "Save mapping" : "Create integration"}
            </button>
          </div>
        </form>
      </article>

      {/* Curl snippets */}
      {config ? (
        <article className="grid gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Request examples
          </h3>
          {showBearerSnippet ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Bearer (simplest — paste-and-go)
              </span>
              <pre className="max-h-80 overflow-auto rounded-2xl bg-[var(--text-primary)] p-4 font-mono text-xs leading-relaxed text-[var(--surface)]">
                {bearerSnippet}
              </pre>
            </div>
          ) : null}
          {showHmacSnippet ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                HMAC (body-signed — tamper-proof)
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
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Recent deliveries
            </h2>
            <button
              type="button"
              className="shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              onClick={() => void refreshDeliveries()}
            >
              Refresh
            </button>
          </header>
          {deliveries.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">No deliveries yet.</p>
          ) : (
            <ul className="grid gap-2">
              {deliveries.map((d) => (
                <li
                  key={d.id}
                  className="grid gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold capitalize text-[var(--text-primary)]">
                      {d.status}
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      {new Date(d.createdAt).toLocaleString()}
                    </span>
                  </span>
                  {d.eventType ? (
                    <span className="text-[var(--text-secondary)]">event: {d.eventType}</span>
                  ) : null}
                  {d.mappedEntityId ? (
                    <span className="break-all font-mono text-[var(--text-secondary)]">
                      entity: {d.mappedEntityId}
                    </span>
                  ) : null}
                  {d.errorMessage ? (
                    <span className="text-[var(--signal-red)]">error: {d.errorMessage}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
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
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </span>
      <div
        className={`mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text-primary)] ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function authModeLabel(mode: IntranetAuthMode): string {
  switch (mode) {
    case "hmac":
      return "HMAC only";
    case "bearer":
      return "Bearer only";
    case "hmac_or_bearer":
      return "HMAC or Bearer";
  }
}

function RevealPanel({
  label,
  value,
  onCopyMessage,
  onDismiss,
}: {
  label: string;
  value: string;
  onCopyMessage: () => void;
  onDismiss: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[color-mix(in_srgb,_var(--signal-amber)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] p-5 sm:p-6">
      <h3 className="text-sm font-semibold tracking-tight text-[var(--signal-amber)]">{label}</h3>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Copy it now. The Integrations Hub only stores the hash — you can regenerate but
        not re-reveal.
      </p>
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
            Copy
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-[color-mix(in_srgb,_var(--signal-amber)_40%,_transparent)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-amber)] transition hover:bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </article>
  );
}
