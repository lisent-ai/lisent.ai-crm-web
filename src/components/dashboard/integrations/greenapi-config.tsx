"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  deleteGreenAPIIntegration,
  getGreenAPIIntegration,
  type GreenAPIIntegration,
  rotateGreenAPIWebhookToken,
  testGreenAPIConnection,
  type GreenAPITestResult,
  upsertGreenAPIIntegration,
} from "@/lib/crm/client";

type Props = {
  companyId: string;
};

/**
 * Owner-only GreenAPI (WhatsApp) config surface inside the Integrations Hub.
 * Lets the operator install/rotate the per-company instance credentials,
 * run a non-mutating connectivity probe against GreenAPI's getSettings
 * endpoint, and disconnect the integration. Server never returns the
 * plaintext token — status shows a masked view only.
 */
export function GreenAPIConfigPanel({ companyId }: Readonly<Props>) {
  const [integration, setIntegration] = useState<GreenAPIIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [idInstance, setIdInstance] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<GreenAPITestResult | null>(null);
  const [rotating, setRotating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await getGreenAPIIntegration(companyId);
      setIntegration(next);
      if (next) {
        setIdInstance(next.idInstance);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : "Could not load GreenAPI config",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTestResult(null);
    try {
      const next = await upsertGreenAPIIntegration(companyId, {
        idInstance: idInstance.trim(),
        apiTokenInstance: apiToken.trim(),
      });
      setIntegration(next);
      setApiToken("");
      setSuccessMessage("Credentials saved. Token stored encrypted.");
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : "Save failed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);
    try {
      const result = await testGreenAPIConnection(companyId);
      setTestResult(result);
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : "Test connection failed",
      );
    } finally {
      setTesting(false);
    }
  }

  async function handleRotateWebhookToken() {
    if (!confirm("Webhook token'ını rotate et? Green API konsolundaki URL'yi güncellemen gerekecek; yoksa gelen WhatsApp mesajları 'unauthorized' olarak işaretlenir.")) {
      return;
    }
    setRotating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const next = await rotateGreenAPIWebhookToken(companyId);
      setIntegration(next);
      setSuccessMessage("Webhook token yenilendi. Yeni URL'yi Green API konsoluna yapıştır.");
    } catch (err) {
      setErrorMessage(err instanceof CRMClientError ? err.message : "Rotate failed");
    } finally {
      setRotating(false);
    }
  }

  async function handleCopyWebhookUrl() {
    if (!integration?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(integration.webhookUrl);
      setSuccessMessage("Webhook URL kopyalandı.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Copy failed");
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect GreenAPI for this company? Incoming WhatsApp messages will stop routing until reconnected.")) {
      return;
    }
    setDeleting(true);
    setErrorMessage(null);
    try {
      await deleteGreenAPIIntegration(companyId);
      setIntegration(null);
      setIdInstance("");
      setApiToken("");
      setSuccessMessage("Disconnected.");
      setTestResult(null);
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : "Disconnect failed",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)]">
        Loading GreenAPI config…
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Inbound webhook URL — the thing the operator has to paste into
          Green API's console. Shown prominently because we spent an hour
          in support chasing why incoming messages never arrived. */}
      {integration ? (
        <article className="rounded-3xl border border-[color-mix(in_srgb,_var(--accent)_24%,_transparent)] bg-[var(--accent-soft)] p-5 sm:p-6">
          <header className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                Green API&apos;ye yapıştırman gereken Webhook URL
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Green API konsolu →{" "}
                <span className="font-semibold text-[var(--text-primary)]">Settings → Notifications</span>
                {" "}bölümündeki{" "}
                <span className="font-semibold text-[var(--text-primary)]">Webhooks URL</span>{" "}
                alanına aşağıdaki URL&apos;yi yapıştır.{" "}
                <span className="font-semibold text-[var(--text-primary)]">Incoming messages</span>,{" "}
                <span className="font-semibold text-[var(--text-primary)]">Incoming message statuses</span>{" "}
                bildirimlerini aç (notification 1 ve 2). Token URL&apos;nin{" "}
                <code className="rounded bg-[var(--surface)] px-1 font-mono text-[var(--text-primary)]">?token=</code>{" "}
                parametresinde yerleşik; Green API özel header gönderemediği için URL-bağlı shared
                secret kullanıyoruz.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,_var(--accent)_30%,_transparent)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
              Inbound
            </span>
          </header>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
              {integration.webhookUrl}
            </code>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="rounded-full border border-[color-mix(in_srgb,_var(--accent)_30%,_transparent)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
              >
                Kopyala
              </button>
              <button
                type="button"
                onClick={handleRotateWebhookToken}
                disabled={rotating}
                className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {rotating ? "Rotating…" : "Rotate token"}
              </button>
            </div>
          </div>
          {integration.webhookUrlToken ? (
            <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">
              token prefix: {integration.webhookUrlToken.slice(0, 12)}…
            </p>
          ) : null}
          <ul className="mt-4 space-y-1 text-xs leading-6 text-[var(--text-secondary)]">
            <li>
              ✓ URL&apos;yi yapıştırmadan{" "}
              <span className="font-semibold text-[var(--text-primary)]">mesaj gönderebilirsin</span>{" "}
              (CRM → müşteri), ama
            </li>
            <li>
              ✗ URL&apos;yi yapıştırmadan{" "}
              <span className="font-semibold text-[var(--text-primary)]">gelen mesajlar sistemine ulaşmaz</span>:
              AI chat başlamaz, CHAMP ekstraksi olmaz, WhatsApp&apos;tan lead yakalanmaz.
            </li>
          </ul>
        </article>
      ) : null}

      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Instance credentials
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Stored encrypted (AES-GCM). Only a masked view is ever returned.
          </p>
        </header>

        {integration ? (
          <div className="mb-4 grid gap-3 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--text-tertiary)]">Instance ID</span>
              <span className="break-all text-right font-mono text-[var(--text-primary)]">{integration.idInstance}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--text-tertiary)]">Token</span>
              <span className="break-all text-right font-mono text-[var(--text-primary)]">{integration.apiTokenMasked}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--text-tertiary)]">Active</span>
              <span className="font-mono text-[var(--text-primary)]">{integration.isActive ? "yes" : "no"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[var(--text-tertiary)]">Updated</span>
              <span className="break-all text-right font-mono text-[var(--text-primary)]">{new Date(integration.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSave} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-[var(--text-secondary)]">Instance ID</span>
            <input
              required
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              placeholder="e.g. 1101234567"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-[var(--text-secondary)]">
              API token {integration ? "(leave blank to keep current)" : ""}
            </span>
            <input
              required={!integration}
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              autoComplete="off"
              placeholder="GreenAPI apiTokenInstance"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !idInstance.trim() || (!integration && !apiToken.trim())}
              className="rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : integration ? "Update credentials" : "Connect"}
            </button>
            {integration ? (
              <>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  {testing ? "Testing…" : "Test connection"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={deleting}
                  className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-5 py-2.5 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:opacity-50"
                >
                  {deleting ? "Disconnecting…" : "Disconnect"}
                </button>
              </>
            ) : null}
          </div>
        </form>
      </article>

      {testResult ? (
        <article
          className={`rounded-3xl border p-5 text-sm sm:p-6 ${
            testResult.ok
              ? "border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] text-[var(--signal-green)]"
              : "border-[color-mix(in_srgb,_var(--signal-amber)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] text-[var(--signal-amber)]"
          }`}
        >
          <p className="font-semibold">
            {testResult.ok ? "Connection OK" : "Connection failed"}
          </p>
          <p className="mt-1">{testResult.message}</p>
          <p className="mt-2 font-mono text-xs">
            upstream status: {testResult.upstreamStatus} · latency: {testResult.upstreamLatency}
          </p>
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
