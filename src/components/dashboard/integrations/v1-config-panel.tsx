"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ConfigPatchInput,
  TenantConfigResponse,
  getConfig,
  patchConfig,
} from "@/lib/qualifier/api-keys-client";

type Props = {
  companyId: string;
  companyName: string;
};

const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  champ:
    "Challenges, Authority, Money, Prioritization — modern B2B standard, challenge-first.",
  bant: "Budget, Authority, Need, Timeline — classic IBM framework, fast sort.",
  meddic:
    "Metrics, Economic buyer, Decision criteria/process, Identify pain, Champion — enterprise complex deals.",
};

const AGGRESSIVENESS_OPTIONS = [
  {
    value: "conservative",
    label: "Conservative",
    desc: "Wait for more signals (threshold ≈ 85)",
  },
  {
    value: "balanced",
    label: "Balanced",
    desc: "Default — threshold ≈ 75",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    desc: "Hand off early (threshold ≈ 65)",
  },
] as const;

export function V1ConfigPanel({ companyId, companyName }: Readonly<Props>) {
  const [data, setData] = useState<TenantConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Local form state — resets when data loads
  const [framework, setFramework] = useState<string>("champ");
  const [threshold, setThreshold] = useState<number>(75);
  const [aggressiveness, setAggressiveness] = useState<string>("balanced");
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [ctaCalendly, setCtaCalendly] = useState<string>("");

  const hydrate = useCallback((d: TenantConfigResponse) => {
    setFramework(d.qualification_framework);
    setThreshold(Number(d.config.qualification_threshold ?? 75));
    setAggressiveness(String(d.config.handoff_aggressiveness ?? "balanced"));
    setWebhookUrl(d.outbound_webhook_url ?? "");
    setCtaCalendly(String(d.config.cta_calendly_url ?? ""));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getConfig(companyId);
      setData(d);
      hydrate(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, [companyId, hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: ConfigPatchInput = {
        qualification_framework: framework as ConfigPatchInput["qualification_framework"],
        qualification_threshold: threshold,
        handoff_aggressiveness:
          aggressiveness as ConfigPatchInput["handoff_aggressiveness"],
        outbound_webhook_url: webhookUrl || undefined,
        cta_calendly_url: ctaCalendly || undefined,
      };
      const updated = await patchConfig(companyId, patch);
      setData(updated);
      hydrate(updated);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading config…
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">
          Scoring & Integration Config
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Framework, threshold, aggressiveness, and outbound webhook for{" "}
          <strong>{companyName}</strong>. Changes apply immediately.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Framework */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        <h3 className="text-sm font-semibold text-slate-900">
          Qualification Framework
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Pick the methodology that best fits your sales motion. Affects prompt
          templates and scoring dimensions.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {(data?.supported_frameworks ?? ["champ", "bant", "meddic"]).map(
            (f) => {
              const active = framework === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFramework(f)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <div className="text-sm font-bold uppercase text-slate-900">
                    {f}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {FRAMEWORK_DESCRIPTIONS[f] ?? ""}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Threshold */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        <h3 className="text-sm font-semibold text-slate-900">
          Qualification Threshold
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Score ≥ threshold → lead marked qualified + handed off.
          Default 75. Dynamic adjustments (project type, budget) may still
          apply at scoring time.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20 rounded-xl border border-slate-300 px-3 py-1 text-sm"
          />
        </div>
      </div>

      {/* Aggressiveness */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        <h3 className="text-sm font-semibold text-slate-900">
          Handoff Aggressiveness
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {AGGRESSIVENESS_OPTIONS.map((opt) => {
            const active = aggressiveness === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAggressiveness(opt.value)}
                aria-pressed={active}
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-slate-950 bg-slate-50"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  {opt.label}
                </div>
                <div className="mt-1 text-xs text-slate-600">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Outbound webhook */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        <h3 className="text-sm font-semibold text-slate-900">
          Outbound Webhook URL
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          When a lead is qualified, Lisent POSTs the full scoring payload to
          this URL. HMAC-signed; configure your secret under Integrations →
          Webhooks (coming soon).
        </p>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://your-crm.example.com/hooks/lisent"
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Calendly CTA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.04)]">
        <h3 className="text-sm font-semibold text-slate-900">
          Medium-score CTA Calendly URL
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Fallback self-service booking link for leads between{" "}
          <code>CTA_MEDIUM_FLOOR</code> and threshold. High-score leads route
          to high-touch CTAs defined elsewhere.
        </p>
        <input
          type="url"
          value={ctaCalendly}
          onChange={(e) => setCtaCalendly(e.target.value)}
          placeholder="https://calendly.com/your-team/intro"
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {savedAt ? `Saved at ${savedAt.toLocaleTimeString()}` : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
