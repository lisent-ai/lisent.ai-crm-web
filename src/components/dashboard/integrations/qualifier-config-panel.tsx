"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  getQualifierConfig,
  revokeQualifierSecondaryToken,
  rotateQualifierToken,
  updateQualifierConfig,
  type QualifierAIConfig,
  type QualifierConfigResponse,
} from "@/lib/crm/client";

type Props = {
  companyId: string;
  /** Sub-view selector. The detail route picks which sub-panel to show. */
  section: "fallback" | "lead-webhook" | "ai-config";
};

const LANGUAGES: QualifierAIConfig["language"][] = ["tr", "en"];
const SECTORS: QualifierAIConfig["sector"][] = ["construction", "general"];
const AGGRESSIVENESS: QualifierAIConfig["handoff_aggressiveness"][] = [
  "conservative",
  "balanced",
  "aggressive",
];

export function QualifierConfigPanel({ companyId, section }: Readonly<Props>) {
  const t = useTranslations();
  const [config, setConfig] = useState<QualifierConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await getQualifierConfig(companyId);
      setConfig(next);
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : t("integrations.qualifier.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)]">
        {t("integrations.qualifier.loading")}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {section === "fallback" ? (
        <FallbackSection
          companyId={companyId}
          config={config}
          onChange={setConfig}
          setError={setErrorMessage}
          setSuccess={setSuccessMessage}
        />
      ) : null}

      {section === "lead-webhook" ? (
        <LeadWebhookSection
          companyId={companyId}
          config={config}
          onChange={setConfig}
          setError={setErrorMessage}
          setSuccess={setSuccessMessage}
        />
      ) : null}

      {section === "ai-config" ? (
        <AIConfigSection
          companyId={companyId}
          config={config}
          onChange={setConfig}
          setError={setErrorMessage}
          setSuccess={setSuccessMessage}
        />
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

type SubProps = {
  companyId: string;
  config: QualifierConfigResponse | null;
  onChange: (next: QualifierConfigResponse | null) => void;
  setError: (msg: string | null) => void;
  setSuccess: (msg: string | null) => void;
};

function FallbackSection({ companyId, config, onChange, setError, setSuccess }: SubProps) {
  const t = useTranslations();
  const [url, setUrl] = useState(config?.fallbackUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(config?.fallbackUrl ?? "");
  }, [config?.fallbackUrl]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateQualifierConfig(companyId, { fallbackUrl: url.trim() });
      if (config) {
        onChange({ ...config, fallbackUrl: url.trim() || null });
      }
      setSuccess(t("integrations.qualifier.fallbackSaved"));
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : t("integrations.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {t("integrations.qualifier.fallbackTitle")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("integrations.qualifier.fallbackDescription")}
        </p>
      </header>
      <form onSubmit={handleSave} className="grid gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("integrations.qualifier.fallbackPlaceholder")}
          className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </article>
  );
}

function LeadWebhookSection({ companyId, config, onChange, setError, setSuccess }: SubProps) {
  const t = useTranslations();
  const [rotating, setRotating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showPrimary, setShowPrimary] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  async function handleRotate() {
    if (!confirm(t("integrations.qualifier.rotateWebhookConfirm"))) {
      return;
    }
    setRotating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await rotateQualifierToken(companyId);
      onChange(
        config
          ? {
              ...config,
              tokenPrimary: result.tokenPrimary,
              tokenSecondary: result.tokenSecondary,
              webhookUrl: result.webhookUrl,
            }
          : {
              companyId,
              tokenPrimary: result.tokenPrimary,
              tokenSecondary: result.tokenSecondary,
              webhookUrl: result.webhookUrl,
              fallbackUrl: null,
              aiConfig: {},
            },
      );
      setSuccess(result.rotationNotice);
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : t("integrations.errors.rotateFailed"));
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeSecondary() {
    if (!confirm(t("integrations.qualifier.revokeSecondaryConfirm"))) {
      return;
    }
    setRevoking(true);
    setError(null);
    setSuccess(null);
    try {
      await revokeQualifierSecondaryToken(companyId);
      if (config) {
        onChange({ ...config, tokenSecondary: null });
      }
      setSuccess(t("integrations.qualifier.secondaryRevoked"));
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : t("integrations.errors.revokeFailed"));
    } finally {
      setRevoking(false);
    }
  }

  function mask(token: string | null | undefined) {
    if (!token) return "—";
    if (token.length <= 12) return token;
    return token.slice(0, 8) + "…" + token.slice(-4);
  }

  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {t("integrations.qualifier.leadWebhookTitle")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("integrations.qualifier.leadWebhookDescription")}
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
                    setSuccess(t("integrations.urlCopied"));
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
      ) : null}

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
            onClick={handleRevokeSecondary}
            disabled={revoking}
            className="rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-5 py-2.5 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] disabled:opacity-50"
          >
            {revoking ? t("integrations.revoking") : t("integrations.revokeSecondary")}
          </button>
        ) : null}
      </div>
    </article>
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

function AIConfigSection({ companyId, config, onChange, setError, setSuccess }: SubProps) {
  const t = useTranslations();
  const [threshold, setThreshold] = useState(
    config?.aiConfig?.qualification_threshold ?? 75,
  );
  const [aggressiveness, setAggressiveness] = useState<
    QualifierAIConfig["handoff_aggressiveness"]
  >(config?.aiConfig?.handoff_aggressiveness ?? "balanced");
  const [language, setLanguage] = useState<QualifierAIConfig["language"]>(
    config?.aiConfig?.language ?? "tr",
  );
  const [sector, setSector] = useState<QualifierAIConfig["sector"]>(
    config?.aiConfig?.sector ?? "construction",
  );
  const [customPromptPrefix, setCustomPromptPrefix] = useState(
    config?.aiConfig?.custom_prompt_prefix ?? "",
  );
  const [idealCustomerProfile, setIdealCustomerProfile] = useState(
    config?.aiConfig?.ideal_customer_profile ?? "",
  );
  const [forbiddenTopics, setForbiddenTopics] = useState(
    (config?.aiConfig?.forbidden_topics ?? []).join(", "),
  );
  const [manualQualify, setManualQualify] = useState(
    Boolean(config?.aiConfig?.manual_qualify),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setThreshold(config.aiConfig?.qualification_threshold ?? 75);
    setAggressiveness(config.aiConfig?.handoff_aggressiveness ?? "balanced");
    setLanguage(config.aiConfig?.language ?? "tr");
    setSector(config.aiConfig?.sector ?? "construction");
    setCustomPromptPrefix(config.aiConfig?.custom_prompt_prefix ?? "");
    setIdealCustomerProfile(config.aiConfig?.ideal_customer_profile ?? "");
    setForbiddenTopics((config.aiConfig?.forbidden_topics ?? []).join(", "));
    setManualQualify(Boolean(config.aiConfig?.manual_qualify));
  }, [config]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const nextConfig: QualifierAIConfig = {
      qualification_threshold: threshold,
      handoff_aggressiveness: aggressiveness,
      language,
      sector,
      custom_prompt_prefix: customPromptPrefix.trim() || undefined,
      ideal_customer_profile: idealCustomerProfile.trim() || undefined,
      forbidden_topics: forbiddenTopics
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      manual_qualify: manualQualify,
    };
    try {
      await updateQualifierConfig(companyId, { aiConfig: nextConfig });
      if (config) {
        onChange({ ...config, aiConfig: nextConfig });
      }
      setSuccess(t("integrations.qualifier.aiConfigSaved"));
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : t("integrations.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {t("integrations.qualifier.aiConfigTitle")}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("integrations.qualifier.aiConfigDescription")}
        </p>
      </header>
      <form onSubmit={handleSave} className="grid gap-4">
        <div className="grid gap-1 text-sm">
          <label className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-secondary)]">
              {t("integrations.qualifier.qualificationThreshold")}
            </span>
            <span className="font-mono text-[var(--text-primary)]">{threshold}</span>
          </label>
          <input
            type="range"
            min={50}
            max={95}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("integrations.qualifier.thresholdHint")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Select<QualifierAIConfig["handoff_aggressiveness"]>
            label={t("integrations.qualifier.handoffAggressiveness")}
            value={aggressiveness}
            options={AGGRESSIVENESS}
            onChange={setAggressiveness}
          />
          <Select<QualifierAIConfig["language"]>
            label={t("integrations.qualifier.languageLabel")}
            value={language}
            options={LANGUAGES}
            onChange={setLanguage}
          />
          <Select<QualifierAIConfig["sector"]>
            label={t("integrations.qualifier.sectorLabel")}
            value={sector}
            options={SECTORS}
            onChange={setSector}
          />
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-[var(--text-secondary)]">
            {t("integrations.qualifier.customPromptPrefix")}
          </span>
          <textarea
            value={customPromptPrefix}
            onChange={(e) => setCustomPromptPrefix(e.target.value)}
            maxLength={2000}
            rows={3}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            placeholder={t("integrations.qualifier.customPromptPlaceholder")}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-[var(--text-secondary)]">
            {t("integrations.qualifier.idealCustomerProfile")}
          </span>
          <textarea
            value={idealCustomerProfile}
            onChange={(e) => setIdealCustomerProfile(e.target.value)}
            maxLength={2000}
            rows={3}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            placeholder={t("integrations.qualifier.icpPlaceholder")}
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm">
          <input
            type="checkbox"
            checked={manualQualify}
            onChange={(e) => setManualQualify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
          />
          <span className="grid gap-0.5">
            <span className="font-semibold text-[var(--text-secondary)]">
              {t("integrations.qualifier.manualQualifyTitle")}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {t.rich("integrations.qualifier.manualQualifyHint", {
                code: (chunks) => (
                  <code className="rounded bg-[var(--surface)] px-1 font-mono text-[var(--text-primary)]">
                    {chunks}
                  </code>
                ),
              })}
            </span>
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-[var(--text-secondary)]">
            {t("integrations.qualifier.forbiddenTopics")}
          </span>
          <input
            value={forbiddenTopics}
            onChange={(e) => setForbiddenTopics(e.target.value)}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            placeholder={t("integrations.qualifier.forbiddenPlaceholder")}
          />
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("integrations.qualifier.forbiddenHint")}
          </p>
        </label>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("integrations.qualifier.saveAiConfig")}
          </button>
        </div>
      </form>
    </article>
  );
}

function Select<T extends string | undefined>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (next: T) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-[var(--text-secondary)]">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm capitalize text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
