"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import {
  CRMClientError,
  getSLAConfig,
  listSLABreaches,
  setSLAConfig,
  type SLABreach,
  type SLACondition,
  type SLAConfig,
  type SLARule,
} from "@/lib/crm/client";
import { formatDateTime } from "@/components/dashboard/leads/lead-utils";

const CONDITIONS: SLACondition[] = ["no_first_response", "no_activity", "stale_open"];

function newRule(): SLARule {
  return {
    id: `tmp-${Math.random().toString(36).slice(2)}`,
    name: "",
    condition: "no_first_response",
    threshold_minutes: 1440,
    active: true,
  };
}

export function SLAWorkspace() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") ?? "";
  const companyName = searchParams.get("companyName") ?? "";

  const [config, setConfig] = useState<SLAConfig>({ rules: [], channel: "in_app" });
  const [breaches, setBreaches] = useState<SLABreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const backHref = companyId
    ? `/dashboard/leads?${new URLSearchParams({ company: companyId, ...(companyName ? { companyName } : {}) }).toString()}`
    : "/dashboard/leads";

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cfg, br] = await Promise.all([
        getSLAConfig(companyId),
        listSLABreaches(companyId, { limit: 50, offset: 0 }).catch(() => ({ data: [], total: 0 })),
      ]);
      setConfig(cfg);
      setBreaches(br.data);
      setAccessDenied(false);
    } catch (err) {
      if (err instanceof CRMClientError && err.status === 403) {
        setAccessDenied(true);
      } else {
        setError(err instanceof CRMClientError ? err.message : t("sla.loadFailed"));
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRule(id: string, patch: Partial<SLARule>) {
    setConfig((c) => ({ ...c, rules: c.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }
  function removeRule(id: string) {
    setConfig((c) => ({ ...c, rules: c.rules.filter((r) => r.id !== id) }));
  }
  function addRule() {
    setConfig((c) => ({ ...c, rules: [...c.rules, newRule()] }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const cleaned: SLAConfig = {
        channel: config.channel,
        rules: config.rules
          .filter((r) => r.threshold_minutes > 0)
          .map((r) => ({ ...r, name: r.name.trim() || t("sla.rules.untitled") })),
      };
      const saved = await setSLAConfig(companyId, cleaned);
      setConfig(saved);
      setSuccess(t("sla.saved"));
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : t("sla.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {t("sla.backToLeads")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t("sla.title")}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-tertiary)]">{t("sla.subtitle")}</p>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-green)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {success}
        </div>
      ) : null}

      {accessDenied ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface)] px-4 text-center text-sm text-[var(--text-tertiary)]">
          {t("sla.accessDenied")}
        </div>
      ) : loading ? (
        <div className="px-5 py-10 text-center text-sm text-[var(--text-tertiary)]">
          {t("sla.loading")}
        </div>
      ) : (
        <>
          {/* Rules */}
          <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t("sla.rules.title")}
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  {t("sla.channel.label")}
                  <select
                    className={inputClass}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, channel: e.target.value as SLAConfig["channel"] }))
                    }
                    value={config.channel}
                  >
                    <option value="in_app">{t("sla.channel.in_app")}</option>
                    <option value="email">{t("sla.channel.email")}</option>
                  </select>
                </label>
                <button
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void save()}
                  type="button"
                >
                  {saving ? t("sla.saving") : t("sla.save")}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {config.rules.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">{t("sla.rules.empty")}</p>
              ) : (
                config.rules.map((rule) => (
                  <div
                    className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 md:flex-row md:items-end"
                    key={rule.id}
                  >
                    <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--text-tertiary)]">
                      {t("sla.rules.name")}
                      <input
                        className={inputClass}
                        onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                        placeholder={t("sla.rules.namePlaceholder")}
                        value={rule.name}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-tertiary)]">
                      {t("sla.rules.condition")}
                      <select
                        className={inputClass}
                        onChange={(e) =>
                          updateRule(rule.id, { condition: e.target.value as SLACondition })
                        }
                        value={rule.condition}
                      >
                        {CONDITIONS.map((cond) => (
                          <option key={cond} value={cond}>
                            {t(`sla.condition.${cond}` as never)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--text-tertiary)]">
                      {t("sla.rules.thresholdHours")}
                      <input
                        className={`${inputClass} w-28`}
                        min={0}
                        onChange={(e) =>
                          updateRule(rule.id, {
                            threshold_minutes: Math.max(
                              0,
                              Math.round((Number(e.target.value) || 0) * 60),
                            ),
                          })
                        }
                        step={0.5}
                        type="number"
                        value={rule.threshold_minutes ? rule.threshold_minutes / 60 : 0}
                      />
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-xs text-[var(--text-secondary)]">
                      <input
                        checked={rule.active}
                        onChange={(e) => updateRule(rule.id, { active: e.target.checked })}
                        type="checkbox"
                      />
                      {t("sla.rules.active")}
                    </label>
                    <button
                      aria-label={t("sla.rules.remove")}
                      className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--signal-red)]"
                      onClick={() => removeRule(rule.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
              <button
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
                onClick={addRule}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t("sla.rules.add")}
              </button>
            </div>
          </section>

          {/* Open breaches */}
          <section className="overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {t("sla.breaches.title")}
              </h2>
            </div>
            {breaches.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">
                {t("sla.breaches.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {breaches.map((b) => (
                  <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between" key={b.id}>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {b.lead_name || t("sla.breaches.unnamedLead")}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {b.rule_name || t(`sla.condition.${b.condition}` as never)} ·{" "}
                        {formatDateTime(b.breached_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[color-mix(in_srgb,_var(--signal-red)_12%,_var(--surface))] px-2 py-0.5 text-xs font-medium text-[var(--signal-red)]">
                      {t(`sla.condition.${b.condition}` as never)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
