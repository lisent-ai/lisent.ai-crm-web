"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  disconnectMetaIntegration,
  getMetaConfig,
  type MetaConfig,
  updateMetaConfig,
} from "@/lib/crm/client";

import { MetaConnectModal } from "./meta-connect-modal";
import { MetaSyncStatus } from "./meta-sync-status";
import { MetaTestLeadButton } from "./meta-test-lead-button";

type MetaConfigPanelProps = {
  companyId: string;
};

// MetaConfigPanel is the per-company Meta integration page. It has two
// states:
//   • Not configured: shows a CTA that opens the connect wizard.
//   • Configured: shows the inbound URLs, masked credentials, mock toggle,
//     test lead button (mock mode only), recent deliveries, and disconnect.
//
// We deliberately do NOT show plain App ID / App Secret / page access
// token after the first connect — only masks. To rotate, use the wizard
// again (it overwrites whatever's stored).
export function MetaConfigPanel({ companyId }: Readonly<MetaConfigPanelProps>) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revealedVerify, setRevealedVerify] = useState<string | null>(null);
  const [deliveriesKey, setDeliveriesKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMetaConfig(companyId)
      .then((res) => {
        if (!cancelled) setConfig(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("integrations.meta.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  async function handleDisconnect() {
    if (!window.confirm(t("integrations.meta.disconnectConfirm"))) return;
    try {
      await disconnectMetaIntegration(companyId);
      setConfig(null);
      setRevealedSecret(null);
      setRevealedVerify(null);
    } catch (err) {
      setError(
        err instanceof CRMClientError ? err.message : t("integrations.meta.loadFailed"),
      );
    }
  }

  async function handleToggleMockMode() {
    if (!config) return;
    try {
      const next = await updateMetaConfig(companyId, { mockMode: !config.mockMode });
      setConfig(next);
    } catch (err) {
      setError(
        err instanceof CRMClientError ? err.message : t("integrations.meta.loadFailed"),
      );
    }
  }

  if (loading) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        …
      </article>
    );
  }

  if (!config) {
    return (
      <article className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
        <header>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("integrations.meta.cardName")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("integrations.meta.cardDescription")}
          </p>
        </header>
        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}
        <button
          className="self-start rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          onClick={() => setShowWizard(true)}
          type="button"
        >
          {t("integrations.meta.connectTitle")}
        </button>
        {showWizard && (
          <MetaConnectModal
            companyId={companyId}
            initial={null}
            onClose={() => setShowWizard(false)}
            onConnected={(integration, secrets) => {
              setConfig(integration);
              setRevealedSecret(secrets.hmacSecretPlain ?? null);
              setRevealedVerify(secrets.webhookVerifyToken);
              setShowWizard(false);
            }}
          />
        )}
      </article>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {t("integrations.meta.cardName")}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("integrations.meta.cardDescription")}
            </p>
            {config.oauthUserName && (
              <p className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--signal-green)]" />
                {t("integrations.meta.authorizedAs", { name: config.oauthUserName })}
                {config.subscribedAt && (
                  <span className="ml-2">
                    ·{" "}
                    {t("integrations.meta.subscribedAt", {
                      when: new Date(config.subscribedAt).toLocaleDateString(),
                    })}
                  </span>
                )}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(config.isActive, config.mockMode)}`}>
            {config.mockMode
              ? t("integrations.meta.mockModeToggle")
              : config.isActive
                ? t("integrations.meta.active")
                : t("integrations.meta.paused")}
          </span>
        </header>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("integrations.meta.pageIdLabel")} value={config.metaPageId ?? "—"} mono />
          <Field label={t("integrations.meta.pageNameLabel")} value={config.metaPageName ?? "—"} />
          <Field
            label={t("integrations.meta.formIdsLabel")}
            mono
            value={config.metaFormIds.length > 0 ? config.metaFormIds.join(", ") : t("integrations.meta.noFormsSelected")}
          />
          {config.mockMode && (
            <>
              <Field
                label={t("integrations.meta.appIdLabel")}
                mono
                value={config.appIdMasked ?? "—"}
              />
              <Field
                label={t("integrations.meta.appSecretLabel")}
                mono
                value={config.appSecretMasked ?? "—"}
              />
            </>
          )}
        </dl>

        <details className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
          <summary className="cursor-pointer select-none text-[var(--text-secondary)]">
            {t("integrations.meta.advancedSection")}
          </summary>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t("integrations.meta.webhookVerifyTokenLabel")}
              mono
              value={config.webhookVerifyToken}
            />
            <Field
              label={t("integrations.meta.n8nUrlLabel")}
              mono
              value={config.n8nWebhookUrl}
            />
            <Field
              label={t("integrations.meta.inboundUrlLabel")}
              mono
              value={config.inboundUrl}
            />
          </dl>
        </details>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
          <button
            className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            onClick={() => setShowWizard(true)}
            type="button"
          >
            {t("integrations.meta.reconfigure")}
          </button>
          {config.mockMode && (
            <button
              className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              onClick={handleToggleMockMode}
              type="button"
            >
              → {t("integrations.meta.active")}
            </button>
          )}
        </div>
      </section>

      {(revealedSecret || revealedVerify) && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card-lg)] border border-[var(--accent)] bg-[var(--accent-soft)] p-5">
          <h3 className="text-sm font-semibold text-[var(--accent-strong)]">
            {t("integrations.meta.hmacSecretHint")}
          </h3>
          {revealedSecret && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--accent-strong)]">
                {t("integrations.meta.hmacSecretLabel")}
              </p>
              <code className="mt-1 block break-all rounded-[var(--radius-card)] bg-[var(--surface)] px-3 py-2 font-mono text-xs">
                {revealedSecret}
              </code>
            </div>
          )}
          {revealedVerify && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--accent-strong)]">
                {t("integrations.meta.webhookVerifyTokenLabel")}
              </p>
              <code className="mt-1 block break-all rounded-[var(--radius-card)] bg-[var(--surface)] px-3 py-2 font-mono text-xs">
                {revealedVerify}
              </code>
            </div>
          )}
        </section>
      )}

      {config.mockMode && (
        <MetaTestLeadButton companyId={companyId} companyName={companyName} />
      )}

      <MetaSyncStatus companyId={companyId} refreshKey={deliveriesKey} />

      <section className="flex flex-col gap-2 rounded-[var(--radius-card-lg)] border border-[var(--signal-red)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
        <h3 className="text-base font-semibold text-[var(--signal-red)]">
          {t("integrations.meta.disconnectTitle")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("integrations.meta.disconnectDescription")}
        </p>
        <button
          className="self-start rounded-full border border-[var(--signal-red)] px-4 py-2 text-sm font-semibold text-[var(--signal-red)] hover:bg-[var(--signal-red)] hover:text-white"
          onClick={handleDisconnect}
          type="button"
        >
          {t("integrations.meta.disconnectButton")}
        </button>
      </section>

      {showWizard && (
        <MetaConnectModal
          companyId={companyId}
          initial={config}
          onClose={() => setShowWizard(false)}
          onConnected={(integration, secrets) => {
            setConfig(integration);
            setRevealedSecret(secrets.hmacSecretPlain ?? null);
            setRevealedVerify(secrets.webhookVerifyToken);
            setShowWizard(false);
            setDeliveriesKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">{label}</dt>
      <dd className={`text-sm text-[var(--text-primary)] ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function statusBadge(isActive: boolean, mockMode: boolean): string {
  if (mockMode) return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  return isActive
    ? "bg-[#dcfce7] text-[#166534]"
    : "bg-[#fef3c7] text-[#92400e]";
}
