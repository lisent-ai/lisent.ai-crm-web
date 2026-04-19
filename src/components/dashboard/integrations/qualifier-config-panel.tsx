"use client";

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
        err instanceof CRMClientError ? err.message : "Could not load qualifier config",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading qualifier config…
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

type SubProps = {
  companyId: string;
  config: QualifierConfigResponse | null;
  onChange: (next: QualifierConfigResponse | null) => void;
  setError: (msg: string | null) => void;
  setSuccess: (msg: string | null) => void;
};

function FallbackSection({ companyId, config, onChange, setError, setSuccess }: SubProps) {
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
      setSuccess("Fallback URL saved.");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          Fallback callback URL
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Qualified leads and score updates are POSTed here. Leave blank to rely
          on the global CRM webhook. HTTPS is required in production.
        </p>
      </header>
      <form onSubmit={handleSave} className="grid gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-crm.example.com/leads/inbound"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
        />
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </article>
  );
}

function LeadWebhookSection({ companyId, config, onChange, setError, setSuccess }: SubProps) {
  const [rotating, setRotating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showPrimary, setShowPrimary] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  async function handleRotate() {
    if (!confirm("Rotate the webhook token? The current token stays valid as secondary until you revoke it.")) {
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
      setError(err instanceof CRMClientError ? err.message : "Rotate failed");
    } finally {
      setRotating(false);
    }
  }

  async function handleRevokeSecondary() {
    if (!confirm("Revoke the secondary token? Any integration still using it will start receiving 401.")) {
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
      setSuccess("Secondary token revoked.");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Revoke failed");
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
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          Lead webhook URL + token rotation
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Per-company webhook for inbound leads. Dual-active rotation: rotating
          slides the current token into a secondary slot so integrators have a
          grace window before you revoke it.
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
                    setSuccess("URL copied");
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
      ) : null}

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
            onClick={handleRevokeSecondary}
            disabled={revoking}
            className="rounded-full border border-rose-300 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {revoking ? "Revoking…" : "Revoke secondary"}
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

function AIConfigSection({ companyId, config, onChange, setError, setSuccess }: SubProps) {
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
    };
    try {
      await updateQualifierConfig(companyId, { aiConfig: nextConfig });
      if (config) {
        onChange({ ...config, aiConfig: nextConfig });
      }
      setSuccess("AI config saved. Takes effect on next lead.");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          AI config
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Applied to scoring and chat for this company only. Unknown keys are
          preserved untouched.
        </p>
      </header>
      <form onSubmit={handleSave} className="grid gap-4">
        <div className="grid gap-1 text-sm">
          <label className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Qualification threshold</span>
            <span className="font-mono text-slate-900">{threshold}</span>
          </label>
          <input
            type="range"
            min={50}
            max={95}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-slate-500">
            Score ≥ threshold ⇒ fast-qualified. Lower values hand off earlier.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Select<QualifierAIConfig["handoff_aggressiveness"]>
            label="Handoff aggressiveness"
            value={aggressiveness}
            options={AGGRESSIVENESS}
            onChange={setAggressiveness}
          />
          <Select<QualifierAIConfig["language"]>
            label="Language"
            value={language}
            options={LANGUAGES}
            onChange={setLanguage}
          />
          <Select<QualifierAIConfig["sector"]>
            label="Sector"
            value={sector}
            options={SECTORS}
            onChange={setSector}
          />
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Custom prompt prefix</span>
          <textarea
            value={customPromptPrefix}
            onChange={(e) => setCustomPromptPrefix(e.target.value)}
            maxLength={2000}
            rows={3}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            placeholder="Prepended to every AI system prompt for this company."
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Ideal customer profile</span>
          <textarea
            value={idealCustomerProfile}
            onChange={(e) => setIdealCustomerProfile(e.target.value)}
            maxLength={2000}
            rows={3}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            placeholder="Describe your best-fit customer. Guides score calibration."
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Forbidden topics</span>
          <input
            value={forbiddenTopics}
            onChange={(e) => setForbiddenTopics(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            placeholder="comma,separated,list"
          />
          <p className="text-xs text-slate-500">
            The AI will refuse to discuss these topics during qualification chat.
          </p>
        </label>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save AI config"}
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
      <span className="font-semibold text-slate-700">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm capitalize focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100"
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
