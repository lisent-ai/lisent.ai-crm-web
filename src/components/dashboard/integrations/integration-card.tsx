"use client";

import Link from "next/link";
import { useState } from "react";

import {
  CRMClientError,
  connectAIQualifier,
  type IntegrationSummary,
} from "@/lib/crm/client";

import { IntegrationStatusBadge } from "./status-badge";

type Props = {
  integration: IntegrationSummary;
  companyId: string;
  companyName: string;
  onConfigure?: () => void;
  onConnected?: () => void;
};

export function IntegrationCard({
  integration,
  companyId,
  companyName,
  onConfigure,
  onConnected,
}: Readonly<Props>) {
  const disabled = integration.status === "coming_soon";
  const href = companyId
    ? `/dashboard/integrations/${integration.slug}?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`
    : undefined;

  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Only the AI Qualifier card has the explicit Connect ceremony right now
  // (Green API / Intranet use their own credential forms as the connect
  // gate). Disconnected → show a primary "Connect" button; Connected →
  // show "Configure" as usual.
  const isQualifierDisconnected =
    integration.slug === "ai-lead-qualifier" && !integration.connected;

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      await connectAIQualifier(companyId);
      onConnected?.();
    } catch (err) {
      setConnectError(
        err instanceof CRMClientError ? err.message : "Connect failed",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <article className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {integration.category}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {integration.name}
          </h3>
        </div>
        <IntegrationStatusBadge status={integration.status} />
      </header>
      <p className="mt-3 flex-grow text-sm leading-6 text-slate-600">
        {integration.description}
      </p>
      {integration.masked_credentials ? (
        <p className="mt-3 font-mono text-xs text-slate-500">
          {integration.masked_credentials}
        </p>
      ) : null}

      {integration.sub_components && integration.sub_components.length > 0 ? (
        <ul className="mt-4 grid gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
          {integration.sub_components.map((sub) => {
            const ok = sub.status === "active";
            return (
              <li
                key={sub.key}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-700">{sub.label}</span>
                <span
                  className={
                    ok
                      ? "font-semibold text-emerald-700"
                      : "text-slate-400"
                  }
                  aria-label={`${sub.label} ${ok ? "configured" : "not configured"}`}
                >
                  {ok ? "✓ configured" : "— not set"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <footer className="mt-6 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {integration.requires_owner_role ? "Owner only" : "Any role"}
          </span>
          {disabled ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500"
            >
              Coming soon
            </button>
          ) : isQualifierDisconnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-full bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:opacity-60"
              aria-label={`Connect ${integration.name}`}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          ) : href ? (
            <Link
              href={href}
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
              aria-label={`Configure ${integration.name}`}
            >
              Configure
            </Link>
          ) : (
            <button
              type="button"
              onClick={onConfigure}
              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
            >
              Configure
            </button>
          )}
        </div>
        {connectError ? (
          <p className="text-xs text-rose-700">{connectError}</p>
        ) : null}
      </footer>
    </article>
  );
}
