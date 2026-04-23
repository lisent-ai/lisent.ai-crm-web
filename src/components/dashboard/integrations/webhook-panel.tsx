"use client";

import { useCallback, useEffect, useState } from "react";

import {
  WebhookConfig,
  WebhookPatchResult,
  getWebhookConfig,
  patchWebhookConfig,
  testWebhook,
} from "@/lib/qualifier/webhook-client";

type Props = {
  companyId: string;
  companyName: string;
};

export function WebhookPanel({ companyId, companyName }: Readonly<Props>) {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [justRotatedSecret, setJustRotatedSecret] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await getWebhookConfig(companyId);
      setConfig(cfg);
      setUrlInput(cfg.url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhook config");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

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
        setNotice("No changes to save");
        return;
      }
      const result: WebhookPatchResult = await patchWebhookConfig(companyId, patch);
      if (result.secret) setJustRotatedSecret(result.secret);
      setNotice(opts.rotate ? "Secret rotated" : "Webhook URL saved");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setLastTestResult(null);
    setError(null);
    try {
      const result = await testWebhook(companyId, { score: 77 });
      setLastTestResult(
        result.enqueued
          ? `Test event enqueued (event_id ${result.event_id}). Consumer should receive POST within ~1s.`
          : "Test event not enqueued (no URL configured?)",
      );
      // DLQ counter may change after delivery; refresh shortly.
      window.setTimeout(() => void refresh(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test fire failed");
    }
  };

  if (loading && !config) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading webhook config…
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Outbound Webhooks</h2>
        <p className="mt-1 text-sm text-slate-500">
          <strong>{companyName}</strong> — Qualifier publishes each{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">score.updated</code>{" "}
          event to your HTTPS endpoint with an HMAC-SHA256 signature. Retry policy: 6
          attempts over ~7h; failures land in DLQ.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {justRotatedSecret ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">New webhook signing secret (copy now — shown once):</div>
          <code className="mt-2 block break-all rounded bg-white px-2 py-1 font-mono text-xs text-slate-900">
            {justRotatedSecret}
          </code>
          <p className="mt-2 text-xs text-amber-800">
            Update your consumer&apos;s verifier with this value. Existing in-flight
            retries will be signed with the new secret on their next attempt.
          </p>
        </div>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <label htmlFor="webhook-url" className="block text-sm font-medium text-slate-700">
            Destination URL
          </label>
          <input
            id="webhook-url"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://consumer.example.com/lisent/webhook"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            HTTPS only. Consumer must return 2xx within 10s; otherwise the delivery is
            retried per the schedule above.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">Signing secret:</span>{" "}
            {config?.has_secret ? (
              <>
                <span className="text-emerald-700">configured</span>
                {config.secret_rotated_at ? (
                  <span className="text-slate-500">
                    {" "}
                    (rotated {new Date(config.secret_rotated_at).toLocaleString()})
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-slate-500">not set — will be generated on first save</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save URL"}
            </button>
            <button
              type="button"
              disabled={saving || !config?.url}
              onClick={() => void save({ rotate: true })}
              className="rounded-lg border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Rotate secret
            </button>
            <button
              type="button"
              disabled={!config?.url || !config?.has_secret}
              onClick={() => void runTest()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Send test event
            </button>
          </div>
        </div>

        {lastTestResult ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {lastTestResult}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Dead-letter queue ({config?.dlq_size ?? 0})
          </h3>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Refresh
          </button>
        </div>

        {!config || config.recent_dlq.length === 0 ? (
          <p className="text-xs text-slate-500">
            No failed deliveries. All events delivered successfully.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Event ID</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Attempts</th>
                  <th className="py-2 pr-4 font-medium">Reason</th>
                  <th className="py-2 pr-4 font-medium">Moved to DLQ</th>
                </tr>
              </thead>
              <tbody>
                {config.recent_dlq.map((e) => (
                  <tr
                    key={`${e.event_id}-${e.delivery_id}`}
                    className="border-b border-slate-50 font-mono"
                  >
                    <td className="py-1.5 pr-4 text-slate-800">{e.event_id ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-slate-600">{e.event_type ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-slate-600">
                      {e.attempt != null ? e.attempt + 1 : "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-rose-700">{e.dlq_reason ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-slate-500">
                      {e.dlq_at_ms ? new Date(e.dlq_at_ms).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-800">
          Consumer verification (signature contract)
        </summary>
        <div className="mt-3 space-y-3">
          <p>
            Lisent sends a <code className="rounded bg-white px-1 py-0.5">POST</code> with these
            headers:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{`X-Lisent-Signature: sha256=<hex>
X-Lisent-Timestamp:  <unix-ms>
X-Lisent-Event-Id:   <unique id, dedupe on this>
X-Lisent-Event-Type: score.updated
X-Lisent-Delivery-Id:<uuid, retry-unique>
Content-Type:        application/json`}</pre>
          <p>Verify by computing:</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{`expected = "sha256=" + hex(HMAC_SHA256(secret, \`\${timestamp}.\${rawBody}\`))
if not constant_time_equals(expected, received):  reject
if abs(now_ms - timestamp_ms) > 300_000:           reject (replay)`}</pre>
          <p>
            Use raw request bytes for the body — do NOT re-serialize JSON (field order is
            preserved by the sender).
          </p>
        </div>
      </details>
    </section>
  );
}
