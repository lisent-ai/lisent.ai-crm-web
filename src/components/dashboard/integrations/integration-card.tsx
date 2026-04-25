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
    <article className="flex flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            {integration.category}
          </p>
          <h3 className="mt-2 text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">
            {integration.name}
          </h3>
        </div>
        <IntegrationStatusBadge status={integration.status} />
      </header>
      <p className="mt-3 flex-grow text-sm leading-6 text-[var(--text-secondary)]">
        {integration.description}
      </p>
      {integration.masked_credentials ? (
        <p className="mt-3 break-all font-mono text-xs text-[var(--text-tertiary)]">
          {integration.masked_credentials}
        </p>
      ) : null}

      {integration.sub_components && integration.sub_components.length > 0 ? (
        <ul className="mt-4 grid gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
          {integration.sub_components.map((sub) => {
            const ok = sub.status === "active";
            return (
              <li
                key={sub.key}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-[var(--text-secondary)]">{sub.label}</span>
                <span
                  className={
                    ok
                      ? "shrink-0 font-semibold text-[var(--signal-green)]"
                      : "shrink-0 text-[var(--text-muted)]"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-tertiary)]">
            {integration.requires_owner_role ? "Owner only" : "Any role"}
          </span>
          {disabled ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)]"
            >
              Coming soon
            </button>
          ) : isQualifierDisconnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60"
              aria-label={`Connect ${integration.name}`}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          ) : href ? (
            <Link
              href={href}
              className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-label={`Configure ${integration.name}`}
            >
              Configure
            </Link>
          ) : (
            <button
              type="button"
              onClick={onConfigure}
              className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Configure
            </button>
          )}
        </div>
        {connectError ? (
          <p className="text-xs text-[var(--signal-red)]">{connectError}</p>
        ) : null}
      </footer>
    </article>
  );
}
