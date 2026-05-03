"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CRMClientError, disconnectAIQualifier } from "@/lib/crm/client";

import { APIKeysPanel } from "./api-keys-panel";
import { QualifierConfigPanel } from "./qualifier-config-panel";
import { QualifierRAGConfigPanel } from "./qualifier-rag-config";
import { UsagePanel } from "./usage-panel";
import { V1ConfigPanel } from "./v1-config-panel";

type Props = {
  companyId: string;
  companyName: string;
  initialTab?: Tab;
};

type Tab =
  | "overview"
  | "lead-webhook"
  | "rag"
  | "fallback"
  | "ai-config"
  | "channels"
  | "api-keys"
  | "usage"
  | "v1-config";

const TAB_KEYS: Record<Tab, string> = {
  overview: "integrations.qualifier.tabs.overview",
  "lead-webhook": "integrations.qualifier.tabs.leadWebhook",
  rag: "integrations.qualifier.tabs.rag",
  fallback: "integrations.qualifier.tabs.fallback",
  "ai-config": "integrations.qualifier.tabs.aiConfig",
  channels: "integrations.qualifier.tabs.channels",
  "api-keys": "integrations.qualifier.tabs.apiKeys",
  usage: "integrations.qualifier.tabs.usage",
  "v1-config": "integrations.qualifier.tabs.v1Config",
};

const TAB_ORDER: Tab[] = [
  "overview",
  "lead-webhook",
  "rag",
  "fallback",
  "ai-config",
  "channels",
  "api-keys",
  "usage",
  "v1-config",
];

/**
 * Unified AI Lead Qualifier integration page.
 *
 * What the user asked for: "tek bir entegration connect dediği an crmdeki
 * deals kısmına bağlanmalı arayüzde ai qualifiera özgü bilgiler eklenmeli".
 * This is the "one integration" half — all four qualifier surfaces live
 * inside here as tabs instead of spreading across four separate catalog
 * cards. The CRM data-binding half (AI score in leads list, insights in
 * lead detail + deal detail) lives in the leads / deals components.
 */
export function AIQualifierPanel({ companyId, companyName, initialTab = "overview" }: Readonly<Props>) {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>(initialTab);

  // When the URL changes (e.g. deep-link from Channels tab into Green API),
  // re-sync the active tab on mount.
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <section className="space-y-6">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:overflow-visible sm:p-0">
        <nav
          aria-label={t("integrations.qualifier.navAria")}
          className="flex min-w-max gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1 text-xs font-semibold sm:flex-wrap sm:min-w-0"
        >
          {TAB_ORDER.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-full px-3 py-2 transition sm:px-4 ${
                  active
                    ? "bg-[var(--text-primary)] text-white shadow-[var(--shadow-xs)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t(TAB_KEYS[key] as never)}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === "overview" ? (
        <OverviewSection companyId={companyId} companyName={companyName} />
      ) : null}
      {tab === "lead-webhook" ? (
        <QualifierConfigPanel companyId={companyId} section="lead-webhook" />
      ) : null}
      {tab === "rag" ? <QualifierRAGConfigPanel companyId={companyId} /> : null}
      {tab === "fallback" ? (
        <QualifierConfigPanel companyId={companyId} section="fallback" />
      ) : null}
      {tab === "ai-config" ? (
        <QualifierConfigPanel companyId={companyId} section="ai-config" />
      ) : null}
      {tab === "channels" ? (
        <ChannelsSection companyId={companyId} companyName={companyName} />
      ) : null}
      {tab === "api-keys" ? (
        <APIKeysPanel companyId={companyId} companyName={companyName} />
      ) : null}
      {tab === "usage" ? (
        <UsagePanel companyId={companyId} companyName={companyName} />
      ) : null}
      {tab === "v1-config" ? (
        <V1ConfigPanel companyId={companyId} companyName={companyName} />
      ) : null}
    </section>
  );
}

function OverviewSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!confirm(t("integrations.qualifier.disconnectConfirm"))) {
      return;
    }
    setDisconnecting(true);
    setErrorMessage(null);
    try {
      await disconnectAIQualifier(companyId);
      // Kick the operator back to the catalog so they see the freshly
      // "Connect"-able card + Leads will hide AI metadata immediately.
      const params = new URLSearchParams();
      params.set("company", companyId);
      params.set("companyName", companyName);
      router.push(`/dashboard/integrations?${params.toString()}`);
    } catch (err) {
      setErrorMessage(
        err instanceof CRMClientError ? err.message : t("integrations.errors.disconnectFailed"),
      );
      setDisconnecting(false);
    }
  }

  return (
    <>
      <div className="rounded-3xl border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] p-5 text-sm text-[var(--text-primary)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--signal-green)]">
              {t("integrations.status.connected")}
            </p>
            <p className="mt-1 font-semibold">
              {t("integrations.qualifier.liveLine")}
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
              {t("integrations.qualifier.liveDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="self-start rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] disabled:opacity-50 sm:self-auto"
          >
            {disconnecting ? t("integrations.disconnecting") : t("integrations.disconnect")}
          </button>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--signal-red)]">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <OverviewBody />
    </>
  );
}

function OverviewBody() {
  const t = useTranslations();
  const codeClass = "rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]";
  const strongClass = "text-[var(--text-primary)]";
  return (
    <article className="space-y-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--text-secondary)] sm:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          {t("integrations.qualifier.overview.title")}
        </h2>
        <p className="mt-2">
          {t.rich("integrations.qualifier.overview.intro", {
            code: (chunks) => <code className={codeClass}>{chunks}</code>,
          })}
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">
          {t("integrations.qualifier.overview.inputsTitle")}
        </h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            {t.rich("integrations.qualifier.overview.inputsLeadWebhook", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("integrations.qualifier.overview.inputsGreenApi", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("integrations.qualifier.overview.inputsIntranet", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">
          {t("integrations.qualifier.overview.tuningTitle")}
        </h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            {t.rich("integrations.qualifier.overview.tuningRag", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("integrations.qualifier.overview.tuningAiConfig", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich("integrations.qualifier.overview.tuningCallback", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">
          {t("integrations.qualifier.overview.outputsTitle")}
        </h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            {t.rich("integrations.qualifier.overview.outputsFields", {
              code: (chunks) => <code className={codeClass}>{chunks}</code>,
            })}
          </li>
          <li>
            {t.rich("integrations.qualifier.overview.outputsLeadList", {
              em: (chunks) => <em>{chunks}</em>,
            })}
          </li>
          <li>
            {t.rich("integrations.qualifier.overview.outputsCallback", {
              strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
            })}
          </li>
        </ul>
      </div>

      <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]">
        {t.rich("integrations.qualifier.overview.tip", {
          strong: (chunks) => <strong className={strongClass}>{chunks}</strong>,
        })}
      </p>
    </article>
  );
}

function ChannelsSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useTranslations();
  const greenapiHref = `/dashboard/integrations/greenapi?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`;
  const intranetHref = `/dashboard/integrations/intranet?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`;
  return (
    <article className="grid gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:grid-cols-2 sm:p-6">
      <ChannelCard
        title={t("integrations.qualifier.channels.whatsappTitle")}
        description={t("integrations.qualifier.channels.whatsappDescription")}
        href={greenapiHref}
      />
      <ChannelCard
        title={t("integrations.qualifier.channels.intranetTitle")}
        description={t("integrations.qualifier.channels.intranetDescription")}
        href={intranetHref}
      />
    </article>
  );
}

function ChannelCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="group grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
    >
      <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
        {title} →
      </span>
      <span className="text-xs leading-6 text-[var(--text-secondary)]">{description}</span>
    </Link>
  );
}
