"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CRMClientError, disconnectAIQualifier } from "@/lib/crm/client";

import { APIKeysPanel } from "./api-keys-panel";
import { QualifierConfigPanel } from "./qualifier-config-panel";
import { QualifierRAGConfigPanel } from "./qualifier-rag-config";
import { UsagePanel } from "./usage-panel";
import { V1ConfigPanel } from "./v1-config-panel";
import { WebhookPanel } from "./webhook-panel";

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
  | "v1-config"
  | "webhooks";

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  "lead-webhook": "Lead Webhook",
  rag: "Knowledge Base (RAG)",
  fallback: "Callback URL",
  "ai-config": "AI Config",
  channels: "Channels",
  "api-keys": "API Keys",
  usage: "Usage",
  "v1-config": "Scoring Config (v1)",
  webhooks: "Outbound Webhooks",
};

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
          aria-label="AI Qualifier sections"
          className="flex min-w-max gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1 text-xs font-semibold sm:flex-wrap sm:min-w-0"
        >
          {(Object.keys(TAB_LABELS) as Tab[]).map((key) => {
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
                {TAB_LABELS[key]}
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
      {tab === "webhooks" ? (
        <WebhookPanel companyId={companyId} companyName={companyName} />
      ) : null}
    </section>
  );
}

function OverviewSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!confirm(
      "Disconnect AI Lead Qualifier from this company? " +
      "Lead scoring chips and insights will disappear from Leads + Deals screens. " +
      "Tokens, AI config, and historical AI metadata are kept — reconnecting brings everything back.",
    )) {
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
        err instanceof CRMClientError ? err.message : "Disconnect failed",
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
              Connected
            </p>
            <p className="mt-1 font-semibold">
              AI Lead Qualifier is live for this company.
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
              Incoming leads get scored, AI chips + insights appear on the
              Leads and Deals screens. Disconnect to hide them without
              deleting data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="self-start rounded-full border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--signal-red)] transition hover:bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] disabled:opacity-50 sm:self-auto"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-[color-mix(in_srgb,_var(--signal-red)_40%,_transparent)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--signal-red)]">
            {errorMessage}
          </p>
        ) : null}
      </div>
      {renderOverviewBody()}
    </>
  );
}

function renderOverviewBody() {
  return (
    <article className="space-y-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--text-secondary)] sm:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          How the Qualifier is wired
        </h2>
        <p className="mt-2">
          AI Lead Qualifier is the scoring + chat brain for this company.
          Leads enter from one or more input channels, a CHAMP-based scorer
          runs, a chat agent converses if needed, and the result — AI score
          + status + reasoning — is written back onto the CRM{" "}
          <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">leads</code>{" "}
          row (and appears in deal detail screens).
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Inputs</h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            <strong className="text-[var(--text-primary)]">Lead Webhook</strong> — your form
            platforms POST JSON here (Zapier / n8n / Facebook Lead Ads / custom).
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Green API (WhatsApp)</strong> — incoming
            WhatsApp messages auto-route into qualification chat.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Intranet</strong> — HMAC-signed inbound
            webhook from your internal systems / ERP.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Tuning</h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            <strong className="text-[var(--text-primary)]">RAG</strong> — upload documents the AI
            should ground its answers on during chat.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">AI Config</strong> — threshold, handoff
            aggressiveness, language, sector, forbidden topics.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Callback URL</strong> — where qualified
            leads are forwarded for systems outside the CRM.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">Outputs</h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            CRM{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">leads.ai_score</code>,{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">ai_status</code>,{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">ai_champ</code>,{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">ai_reasoning</code>,{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1 font-mono text-[var(--text-primary)]">ai_score_breakdown</code>{" "}
            populated on every scoring cycle.
          </li>
          <li>
            Lead list shows an <em>AI Score</em> column + status badge;
            lead / deal detail panels render an <em>AI Insights</em> block.
          </li>
          <li>
            When <strong className="text-[var(--text-primary)]">Callback URL</strong> is set,
            qualified leads are also POSTed to the external endpoint (retried with backoff).
          </li>
        </ul>
      </div>

      <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]">
        Tip — start with{" "}
        <strong className="text-[var(--text-primary)]">Lead Webhook</strong> +{" "}
        <strong className="text-[var(--text-primary)]">AI Config</strong>. That&apos;s the minimum
        viable install; everything else is additive.
      </p>
    </article>
  );
}

function ChannelsSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const greenapiHref = `/dashboard/integrations/greenapi?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`;
  const intranetHref = `/dashboard/integrations/intranet?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`;
  return (
    <article className="grid gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:grid-cols-2 sm:p-6">
      <ChannelCard
        title="WhatsApp (Green API)"
        description="Incoming WhatsApp messages kick off qualification chat automatically."
        href={greenapiHref}
      />
      <ChannelCard
        title="Intranet (HMAC inbound)"
        description="HMAC-signed webhook from your own intranet / ERP → leads pipeline."
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
