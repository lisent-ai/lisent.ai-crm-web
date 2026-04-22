"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CRMClientError, disconnectAIQualifier } from "@/lib/crm/client";

import { APIKeysPanel } from "./api-keys-panel";
import { QualifierConfigPanel } from "./qualifier-config-panel";
import { QualifierRAGConfigPanel } from "./qualifier-rag-config";

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
  | "api-keys";

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  "lead-webhook": "Lead Webhook",
  rag: "Knowledge Base (RAG)",
  fallback: "Callback URL",
  "ai-config": "AI Config",
  channels: "Channels",
  "api-keys": "API Keys",
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
      <nav
        aria-label="AI Qualifier sections"
        className="flex flex-wrap gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold"
      >
        {(Object.keys(TAB_LABELS) as Tab[]).map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 transition ${
                active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </nav>

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
      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5 text-sm text-emerald-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
              Connected
            </p>
            <p className="mt-1 font-semibold">
              AI Lead Qualifier is live for this company.
            </p>
            <p className="mt-1 text-xs leading-6">
              Incoming leads get scored, AI chips + insights appear on the
              Leads and Deals screens. Disconnect to hide them without
              deleting data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs text-rose-700">
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
    <article className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-700">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          How the Qualifier is wired
        </h2>
        <p className="mt-2">
          AI Lead Qualifier is the scoring + chat brain for this company.
          Leads enter from one or more input channels, a CHAMP-based scorer
          runs, a chat agent converses if needed, and the result — AI score
          + status + reasoning — is written back onto the CRM{" "}
          <code>leads</code> row (and appears in deal detail screens).
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">Inputs</h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            <strong>Lead Webhook</strong> — your form platforms POST JSON here
            (Zapier / n8n / Facebook Lead Ads / custom).
          </li>
          <li>
            <strong>Green API (WhatsApp)</strong> — incoming WhatsApp messages
            auto-route into qualification chat.
          </li>
          <li>
            <strong>Intranet</strong> — HMAC-signed inbound webhook from your
            internal systems / ERP.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">Tuning</h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            <strong>RAG</strong> — upload documents the AI should ground its
            answers on during chat.
          </li>
          <li>
            <strong>AI Config</strong> — threshold, handoff aggressiveness,
            language, sector, forbidden topics.
          </li>
          <li>
            <strong>Callback URL</strong> — where qualified leads are
            forwarded for systems outside the CRM.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">Outputs</h3>
        <ul className="mt-2 grid gap-1.5">
          <li>
            CRM <code>leads.ai_score</code>, <code>ai_status</code>,{" "}
            <code>ai_champ</code>, <code>ai_reasoning</code>,{" "}
            <code>ai_score_breakdown</code> populated on every scoring cycle.
          </li>
          <li>
            Lead list shows an <em>AI Score</em> column + status badge;
            lead / deal detail panels render an <em>AI Insights</em> block.
          </li>
          <li>
            When <strong>Callback URL</strong> is set, qualified leads are
            also POSTed to the external endpoint (retried with backoff).
          </li>
        </ul>
      </div>

      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        Tip — start with <strong>Lead Webhook</strong> + <strong>AI Config</strong>.
        That&apos;s the minimum viable install; everything else is additive.
      </p>
    </article>
  );
}

function ChannelsSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const greenapiHref = `/dashboard/integrations/greenapi?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`;
  const intranetHref = `/dashboard/integrations/intranet?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`;
  return (
    <article className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-6 md:grid-cols-2">
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
      className="group grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-400 hover:bg-cyan-50"
    >
      <span className="text-sm font-semibold tracking-tight text-slate-950">
        {title} →
      </span>
      <span className="text-xs leading-6 text-slate-600">{description}</span>
    </Link>
  );
}
