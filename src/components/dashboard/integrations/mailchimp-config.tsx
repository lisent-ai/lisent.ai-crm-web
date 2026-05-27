"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  disconnectMailchimp,
  getMailchimpConfig,
  type MailchimpConfig,
} from "@/lib/crm/client";

import { MailchimpConnectModal } from "./mailchimp-connect-modal";

type MailchimpConfigPanelProps = {
  companyId: string;
  operatorEmail?: string;
};

// MailchimpConfigPanel is the per-OPERATOR Mailchimp integration page.
// Renders one of two states:
//
//   • Not connected — single CTA opens the Nango popup wizard
//   • Connected — account badge (name + dc + login_url), push counters,
//                 reconnect / disconnect buttons, link into the daily
//                 Marketing → Email workspace
//
// Privacy contract: every fetch goes to /users/me/mailchimp* so it only
// ever sees the calling operator's own connection — even an owner viewing
// this page sees THEIR connection, not the company-wide roster. The
// owner roster lives at a separate sub-section (added in a follow-up
// step) under /dashboard/integrations/mailchimp/team.
export function MailchimpConfigPanel({
  companyId,
  operatorEmail,
}: Readonly<MailchimpConfigPanelProps>) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const [config, setConfig] = useState<MailchimpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // React 19 lint flags synchronous setState at the top of an effect.
    // We rely on initial state (loading=true, config=null, error=null)
    // for the first render; effect callbacks (then/catch/finally) are
    // async and fine. On companyId change the previous values remain
    // visible for the network round-trip — acceptable since switching
    // companies is rare and the spinner-vs-stale tradeoff doesn't
    // justify a useReducer here.
    let cancelled = false;
    getMailchimpConfig(companyId)
      .then((res) => {
        if (!cancelled) {
          setConfig(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("integrations.mailchimp.loadFailed"),
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
    if (!window.confirm(t("integrations.mailchimp.disconnectConfirm"))) return;
    try {
      await disconnectMailchimp(companyId);
      setConfig(null);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : t("integrations.mailchimp.loadFailed"),
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
      <>
        <article className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
          <header>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("integrations.mailchimp.cardName")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("integrations.mailchimp.cardDescription")}
            </p>
            {companyName ? (
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                {t("integrations.mailchimp.scopedToCompany", { name: companyName })}
              </p>
            ) : null}
          </header>
          {error && (
            <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
              {error}
            </p>
          )}
          <button
            type="button"
            className="self-start rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            onClick={() => setShowWizard(true)}
          >
            {t("integrations.mailchimp.connectCta")}
          </button>
        </article>
        {showWizard && (
          <MailchimpConnectModal
            companyId={companyId}
            operatorEmail={operatorEmail}
            onClose={() => setShowWizard(false)}
            onConnected={(next) => {
              setConfig(next);
              setShowWizard(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <article className="flex flex-col gap-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("integrations.mailchimp.cardName")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {config.accountName
                ? t("integrations.mailchimp.connectedAs", {
                    name: config.accountName,
                    email: config.accountEmail ?? "",
                  })
                : t("integrations.mailchimp.connected")}
            </p>
          </div>
          <span className="self-start rounded-full bg-[var(--signal-green-soft)] px-3 py-1 text-xs font-semibold text-[var(--signal-green)]">
            {config.isActive
              ? t("integrations.mailchimp.statusActive")
              : t("integrations.mailchimp.statusPaused")}
          </span>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("integrations.mailchimp.dcLabel")}
            </dt>
            <dd className="mt-0.5 font-mono text-[var(--text-primary)]">{config.dc}</dd>
          </div>
          {config.totalSubscribers !== undefined ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("integrations.mailchimp.totalSubscribersLabel")}
              </dt>
              <dd className="mt-0.5 text-[var(--text-primary)]">
                {config.totalSubscribers.toLocaleString()}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("integrations.mailchimp.pushCountLabel")}
            </dt>
            <dd className="mt-0.5 text-[var(--text-primary)]">
              {config.pushCountSuccess} / {config.pushCountTotal}
              {config.pushCountFailed > 0 ? (
                <span className="ml-2 text-[var(--signal-red)]">
                  ({config.pushCountFailed} {t("integrations.mailchimp.failed")})
                </span>
              ) : null}
            </dd>
          </div>
          {config.lastPushAt ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("integrations.mailchimp.lastPushLabel")}
              </dt>
              <dd className="mt-0.5 text-[var(--text-primary)]">
                {new Date(config.lastPushAt).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/marketing/email?company=${encodeURIComponent(companyId)}${companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""}`}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            {t("integrations.mailchimp.openEmailModule")}
          </Link>
          <button
            type="button"
            className="rounded-full border border-[var(--border-subtle)] px-5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            onClick={() => setShowWizard(true)}
          >
            {t("integrations.mailchimp.reconnect")}
          </button>
          {config.loginUrl ? (
            <a
              href={config.loginUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              {t("integrations.mailchimp.openInMailchimp")}
            </a>
          ) : null}
          <button
            type="button"
            className="ml-auto rounded-full border border-[var(--signal-red)] px-4 py-2 text-sm font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
            onClick={handleDisconnect}
          >
            {t("integrations.mailchimp.disconnect")}
          </button>
        </div>
      </article>
      {showWizard && (
        <MailchimpConnectModal
          companyId={companyId}
          operatorEmail={operatorEmail}
          onClose={() => setShowWizard(false)}
          onConnected={(next) => {
            setConfig(next);
            setShowWizard(false);
          }}
        />
      )}
    </>
  );
}
