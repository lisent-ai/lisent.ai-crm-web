"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  canManage?: boolean;
  onConfigure?: () => void;
  onConnected?: () => void;
};

export function IntegrationCard({
  integration,
  companyId,
  companyName,
  canManage = true,
  onConfigure,
  onConnected,
}: Readonly<Props>) {
  const t = useTranslations();
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
        err instanceof CRMClientError ? err.message : t("integrations.errors.connectFailed"),
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
                  aria-label={
                    ok
                      ? t("integrations.subComponent.configuredAria", { label: sub.label })
                      : t("integrations.subComponent.notSetAria", { label: sub.label })
                  }
                >
                  {ok
                    ? t("integrations.subComponent.configured")
                    : t("integrations.subComponent.notSet")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <footer className="mt-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-tertiary)]">
            {integration.requires_owner_role
              ? t("integrations.role.ownerOnly")
              : t("integrations.role.anyRole")}
          </span>
          {disabled ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)]"
            >
              {t("integrations.status.comingSoon")}
            </button>
          ) : !canManage ? (
            <span
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)]"
              title={t("integrations.role.viewOnlyTitle")}
            >
              {t("integrations.role.viewOnly")}
            </span>
          ) : isQualifierDisconnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60"
              aria-label={t("integrations.connectAria", { name: integration.name })}
            >
              {connecting ? t("integrations.connecting") : t("integrations.connect")}
            </button>
          ) : href ? (
            <Link
              href={href}
              className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-label={t("integrations.configureAria", { name: integration.name })}
            >
              {t("integrations.configure")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onConfigure}
              className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {t("integrations.configure")}
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
