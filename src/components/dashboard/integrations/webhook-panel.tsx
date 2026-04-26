"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  WebhookConfig,
  WebhookPatchInput,
  WebhookPatchResult,
  WebhookPayloadMode,
  getWebhookConfig,
  patchWebhookConfig,
  testWebhook,
} from "@/lib/qualifier/webhook-client";

function categoryLabel(t: ReturnType<typeof useTranslations>, category: string): string {
  if (category === "scoring" || category === "lifecycle" || category === "pipeline") {
    return t(`integrations.webhooks.categories.${category}` as never);
  }
  return category;
}

function splitPatterns(enabled: string[]): { exacts: Set<string>; customs: string[] } {
  const exacts = new Set<string>();
  const customs: string[] = [];
  for (const raw of enabled) {
    const p = (raw ?? "").trim();
    if (!p) continue;
    if (p === "*" || p.endsWith(".*")) {
      customs.push(p);
    } else {
      exacts.add(p);
    }
  }
  return { exacts, customs };
}

type Props = {
  companyId: string;
  companyName: string;
};

export function WebhookPanel({ companyId, companyName }: Readonly<Props>) {
  const t = useTranslations();
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [justRotatedSecret, setJustRotatedSecret] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [customPatterns, setCustomPatterns] = useState<string>("");
  const [payloadMode, setPayloadMode] = useState<WebhookPayloadMode>("full");
  const [savingEvents, setSavingEvents] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await getWebhookConfig(companyId);
      setConfig(cfg);
      setUrlInput(cfg.url ?? "");
      const { exacts, customs } = splitPatterns(cfg.enabled_events ?? ["*"]);
      setSelectedEvents(exacts);
      setCustomPatterns(customs.join("\n"));
      setPayloadMode(cfg.payload_mode ?? "full");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrations.webhooks.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async (opts: { rotate?: boolean } = {}) => {
    setSaving(true);
    setNotice(null);
    setJustRotatedSecret(null);
    try {
      const patch: { url?: string; rotate_secret?: boolean } = {};
      if (urlInput && urlInput !== (config?.url ?? "")) patch.url = urlInput;
      if (opts.rotate) patch.rotate_secret = true;
      if (Object.keys(patch).length === 0) {
        setNotice(t("integrations.webhooks.noChanges"));
        return;
      }
      const result: WebhookPatchResult = await patchWebhookConfig(companyId, patch);
      if (result.secret) setJustRotatedSecret(result.secret);
      setNotice(
        opts.rotate
          ? t("integrations.webhooks.secretRotated")
          : t("integrations.webhooks.urlSaved"),
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrations.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  const toggleCategory = (events: string[], enable: boolean) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      for (const e of events) {
        if (enable) next.add(e);
        else next.delete(e);
      }
      return next;
    });
  };

  const saveEventSelection = async () => {
    setSavingEvents(true);
    setNotice(null);
    setError(null);
    try {
      const customs = customPatterns
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const patterns = [...Array.from(selectedEvents), ...customs];
      if (patterns.length === 0) {
        setError(t("integrations.webhooks.selectAtLeastOne"));
        return;
      }
      const patch: WebhookPatchInput = {
        enabled_events: patterns,
        payload_mode: payloadMode,
      };
      await patchWebhookConfig(companyId, patch);
      setNotice(t("integrations.webhooks.eventSelectionSaved"));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrations.errors.saveFailed"));
    } finally {
      setSavingEvents(false);
    }
  };

  const runTest = async () => {
    setLastTestResult(null);
    setError(null);
    try {
      const result = await testWebhook(companyId, { score: 77 });
      setLastTestResult(
        result.enqueued
          ? t("integrations.webhooks.testEnqueued", { eventId: result.event_id })
          : t("integrations.webhooks.testNotEnqueued"),
      );
      // DLQ counter may change after delivery; refresh shortly.
      window.setTimeout(() => void refresh(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrations.webhooks.testFailed"));
    }
  };

  if (loading && !config) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("integrations.webhooks.loading")}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
          {t("integrations.webhooks.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {t.rich("integrations.webhooks.description", {
            name: companyName,
            strong: (chunks) => (
              <strong className="text-[var(--text-secondary)]">{chunks}</strong>
            ),
            code: (chunks) => (
              <code className="rounded bg-[var(--surface-inset)] px-1 py-0.5 font-mono text-xs text-[var(--text-primary)]">
                {chunks}
              </code>
            ),
          })}
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_10%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {notice}
        </div>
      ) : null}

      {justRotatedSecret ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-amber)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-amber)]">
          <div className="font-semibold">{t("integrations.webhooks.newSecretLabel")}</div>
          <code className="mt-2 block break-all rounded-xl bg-[var(--surface)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]">
            {justRotatedSecret}
          </code>
          <p className="mt-2 text-xs">
            {t("integrations.webhooks.newSecretHint")}
          </p>
        </div>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <div>
          <label htmlFor="webhook-url" className="block text-sm font-medium text-[var(--text-secondary)]">
            {t("integrations.webhooks.destinationUrl")}
          </label>
          <input
            id="webhook-url"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t("integrations.webhooks.destinationPlaceholder")}
            className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {t("integrations.webhooks.destinationHint")}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">{t("integrations.webhooks.signingSecret")}:</span>{" "}
            {config?.has_secret ? (
              <>
                <span className="text-[var(--signal-green)]">{t("integrations.webhooks.configured")}</span>
                {config.secret_rotated_at ? (
                  <span className="text-[var(--text-tertiary)]">
                    {" "}
                    {t("integrations.webhooks.rotatedAt", {
                      time: new Date(config.secret_rotated_at).toLocaleString(),
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-[var(--text-tertiary)]">{t("integrations.webhooks.notSetWillGenerate")}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("integrations.webhooks.saveUrl")}
            </button>
            <button
              type="button"
              disabled={saving || !config?.url}
              onClick={() => void save({ rotate: true })}
              className="rounded-full border border-[color-mix(in_srgb,_var(--signal-amber)_40%,_transparent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--signal-amber)] transition hover:bg-[color-mix(in_srgb,_var(--signal-amber)_10%,_var(--surface))] disabled:opacity-50"
            >
              {t("integrations.webhooks.rotateSecret")}
            </button>
            <button
              type="button"
              disabled={!config?.url || !config?.has_secret}
              onClick={() => void runTest()}
              className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              {t("integrations.webhooks.sendTestEvent")}
            </button>
          </div>
        </div>

        {lastTestResult ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,_var(--accent)_24%,_transparent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent-strong)]">
            {lastTestResult}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("integrations.webhooks.eventSelectionTitle")}</h3>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {t.rich("integrations.webhooks.eventSelectionDescription", {
              code: (chunks) => (
                <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">
                  {chunks}
                </code>
              ),
            })}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(config?.event_catalog ?? {}).map(([category, events]) => {
            const allOn = events.every((e) => selectedEvents.has(e));
            return (
              <div key={category} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    {categoryLabel(t, category)}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(events, !allOn)}
                    className="text-[11px] font-medium text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
                  >
                    {allOn ? t("integrations.webhooks.clear") : t("integrations.webhooks.selectAll")}
                  </button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {events.map((e) => (
                    <li key={e}>
                      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={selectedEvents.has(e)}
                          onChange={() => toggleEvent(e)}
                          className="h-3.5 w-3.5 rounded border-[var(--border-default)] accent-[var(--accent)]"
                        />
                        <code className="font-mono text-[11px] text-[var(--text-primary)]">{e}</code>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div>
          <label htmlFor="custom-patterns" className="block text-xs font-medium text-[var(--text-secondary)]">
            {t("integrations.webhooks.customPatternsLabel")}
          </label>
          <textarea
            id="custom-patterns"
            value={customPatterns}
            onChange={(e) => setCustomPatterns(e.target.value)}
            placeholder={"lead.*\n*"}
            rows={2}
            className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
        </div>

        <fieldset>
          <legend className="text-xs font-medium text-[var(--text-secondary)]">{t("integrations.webhooks.payloadMode")}</legend>
          <div className="mt-2 flex flex-col gap-2 text-xs text-[var(--text-secondary)] sm:flex-row sm:flex-wrap sm:gap-4">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="payload-mode"
                value="full"
                checked={payloadMode === "full"}
                onChange={() => setPayloadMode("full")}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <span className="font-medium text-[var(--text-primary)]">{t("integrations.webhooks.payloadFullLabel")}</span>
                <span className="ml-1 text-[var(--text-tertiary)]">{t("integrations.webhooks.payloadFullDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="payload-mode"
                value="minimal"
                checked={payloadMode === "minimal"}
                onChange={() => setPayloadMode("minimal")}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <span className="font-medium text-[var(--text-primary)]">{t("integrations.webhooks.payloadMinimalLabel")}</span>
                <span className="ml-1 text-[var(--text-tertiary)]">{t("integrations.webhooks.payloadMinimalDesc")}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {t("integrations.webhooks.currentLabel")}:{" "}
            <code className="break-all font-mono text-[var(--text-secondary)]">
              {(config?.enabled_events ?? []).join(", ") || "—"}
            </code>
          </div>
          <button
            type="button"
            disabled={savingEvents}
            onClick={() => void saveEventSelection()}
            className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:self-end"
          >
            {savingEvents ? t("common.saving") : t("integrations.webhooks.saveEventSelection")}
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t("integrations.webhooks.dlqTitle", { count: config?.dlq_size ?? 0 })}
          </h3>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {t("integrations.refresh")}
          </button>
        </div>

        {!config || config.recent_dlq.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("integrations.webhooks.dlqEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left text-[var(--text-tertiary)]">
                  <th className="py-2 pr-4 font-medium">{t("integrations.webhooks.dlqCols.eventId")}</th>
                  <th className="py-2 pr-4 font-medium">{t("integrations.webhooks.dlqCols.type")}</th>
                  <th className="py-2 pr-4 font-medium">{t("integrations.webhooks.dlqCols.attempts")}</th>
                  <th className="py-2 pr-4 font-medium">{t("integrations.webhooks.dlqCols.reason")}</th>
                  <th className="py-2 pr-4 font-medium">{t("integrations.webhooks.dlqCols.movedToDlq")}</th>
                </tr>
              </thead>
              <tbody>
                {config.recent_dlq.map((e) => (
                  <tr
                    key={`${e.event_id}-${e.delivery_id}`}
                    className="border-b border-[var(--border-subtle)] font-mono"
                  >
                    <td className="py-1.5 pr-4 text-[var(--text-primary)]">{e.event_id ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-[var(--text-secondary)]">{e.event_type ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-[var(--text-secondary)]">
                      {e.attempt != null ? e.attempt + 1 : "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-[var(--signal-red)]">{e.dlq_reason ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-[var(--text-tertiary)]">
                      {e.dlq_at_ms ? new Date(e.dlq_at_ms).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <details className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--text-secondary)]">
        <summary className="cursor-pointer font-medium text-[var(--text-primary)]">
          {t("integrations.webhooks.verificationTitle")}
        </summary>
        <div className="mt-3 space-y-3">
          <p>
            {t.rich("integrations.webhooks.verificationIntro", {
              code: (chunks) => (
                <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-[var(--text-primary)]">
                  {chunks}
                </code>
              ),
            })}
          </p>
          <pre className="overflow-x-auto rounded-xl bg-[var(--text-primary)] p-3 font-mono text-xs text-[var(--surface)]">{`X-Lisent-Signature: sha256=<hex>
X-Lisent-Timestamp:  <unix-ms>
X-Lisent-Event-Id:   <unique id, dedupe on this>
X-Lisent-Event-Type: score.updated
X-Lisent-Delivery-Id:<uuid, retry-unique>
Content-Type:        application/json`}</pre>
          <p>{t("integrations.webhooks.verifyByComputing")}</p>
          <pre className="overflow-x-auto rounded-xl bg-[var(--text-primary)] p-3 font-mono text-xs text-[var(--surface)]">{`expected = "sha256=" + hex(HMAC_SHA256(secret, \`\${timestamp}.\${rawBody}\`))
if not constant_time_equals(expected, received):  reject
if abs(now_ms - timestamp_ms) > 300_000:           reject (replay)`}</pre>
          <p>
            {t("integrations.webhooks.verificationNote")}
          </p>
        </div>
      </details>
    </section>
  );
}
