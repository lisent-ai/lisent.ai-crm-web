"use client";

import { useTranslations } from "next-intl";
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

const AGGRESSIVENESS_VALUES = ["conservative", "balanced", "aggressive"] as const;

export function V1ConfigPanel({ companyId, companyName }: Readonly<Props>) {
  const t = useTranslations();
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
      setError(err instanceof Error ? err.message : t("integrations.v1.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [companyId, hydrate, t]);

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
      setError(err instanceof Error ? err.message : t("integrations.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("integrations.v1.loading")}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
          {t("integrations.v1.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          {t.rich("integrations.v1.description", {
            name: companyName,
            strong: (chunks) => (
              <strong className="text-[var(--text-secondary)]">{chunks}</strong>
            ),
          })}
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.v1.frameworkTitle")}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          {t("integrations.v1.frameworkDescription")}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(data?.supported_frameworks ?? ["champ", "bant", "meddic"]).map(
            (f) => {
              const active = framework === f;
              const descKey =
                f === "champ" || f === "bant" || f === "meddic"
                  ? `integrations.v1.frameworkDescriptions.${f}`
                  : null;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFramework(f)}
                  aria-pressed={active}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[var(--text-primary)] bg-[var(--surface-muted)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="text-sm font-bold uppercase text-[var(--text-primary)]">
                    {f}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {descKey ? t(descKey as never) : ""}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.v1.thresholdTitle")}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          {t("integrations.v1.thresholdDescription")}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-20 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.v1.aggressivenessTitle")}
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {AGGRESSIVENESS_VALUES.map((value) => {
            const active = aggressiveness === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAggressiveness(value)}
                aria-pressed={active}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-[var(--text-primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {t(`integrations.v1.aggressiveness.${value}.label`)}
                </div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  {t(`integrations.v1.aggressiveness.${value}.desc`)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.v1.outboundWebhookTitle")}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          {t("integrations.v1.outboundWebhookDescription")}
        </p>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder={t("integrations.v1.outboundWebhookPlaceholder")}
          className="mt-3 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t("integrations.v1.calendlyTitle")}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          {t.rich("integrations.v1.calendlyDescription", {
            code: (chunks) => (
              <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">
                {chunks}
              </code>
            ),
          })}
        </p>
        <input
          type="url"
          value={ctaCalendly}
          onChange={(e) => setCtaCalendly(e.target.value)}
          placeholder={t("integrations.v1.calendlyPlaceholder")}
          className="mt-3 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[var(--text-tertiary)]">
          {savedAt ? t("integrations.v1.savedAt", { time: savedAt.toLocaleTimeString() }) : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[var(--text-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:self-end"
        >
          {saving ? t("common.saving") : t("integrations.v1.saveChanges")}
        </button>
      </div>
    </section>
  );
}
