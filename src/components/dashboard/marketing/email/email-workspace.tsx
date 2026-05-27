"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  getMailchimpConfig,
  type MailchimpConfig,
} from "@/lib/crm/client";
import { MailchimpConnectModal } from "@/components/dashboard/integrations/mailchimp-connect-modal";

import { AudienceList } from "./audience-list";
import { CampaignList } from "./campaign-list";

// URL-state sub-tabs for the Email workspace. Active tab comes from
// ?tab=…; we keep `audiences` as the default so a bare /dashboard/marketing/email
// query lands on the first useful surface.
const TABS = ["audiences", "campaigns", "templates", "reports", "settings"] as const;
type EmailTab = (typeof TABS)[number];

function resolveTab(raw: string | null): EmailTab {
  if (raw && (TABS as readonly string[]).includes(raw)) {
    return raw as EmailTab;
  }
  return "audiences";
}

// EmailWorkspace — the Marketing → Email module's root. Three layers:
//
//   1. Company resolution — pulls ?company=… from the URL (same convention
//      Marketing → Campaigns uses). Without it we show a picker hint so
//      the operator hops back to /dashboard via the picker.
//   2. Mailchimp connection state — fetches /users/me/mailchimp-config?company.
//      404 → empty state with inline Connect CTA (re-using the same modal
//      the Integrations Hub uses, so the OAuth path is single-sourced).
//   3. Tab strip — once connected, renders Audiences (this step) + four
//      placeholders that get filled in over the next steps (Campaigns,
//      Templates, Reports, Settings).
export function EmailWorkspace() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";
  const tab = resolveTab(searchParams.get("tab"));

  const [config, setConfig] = useState<MailchimpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Skip the fetch entirely when no company is in scope — the render
    // path short-circuits below and the loading state stays at its
    // initial true value, but the effect itself stays setState-free
    // to keep React 19's set-state-in-effect lint rule happy.
    if (!companyId) {
      return undefined;
    }
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
            : t("marketing.email.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const onConnected = useCallback((next: MailchimpConfig) => {
    setConfig(next);
    setShowWizard(false);
  }, []);

  const baseSuffix = useMemo(() => {
    const usp = new URLSearchParams();
    if (companyId) usp.set("company", companyId);
    if (companyName) usp.set("companyName", companyName);
    return usp.toString();
  }, [companyId, companyName]);

  if (!companyId) {
    return (
      <EmptyShell
        title={t("marketing.email.noCompanyTitle")}
        body={t("marketing.email.noCompanyBody")}
      />
    );
  }

  if (loading) {
    return <EmptyShell title="…" body="" />;
  }

  if (!config) {
    return (
      <>
        <article className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
          <header>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("marketing.email.notConnectedTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("marketing.email.notConnectedBody")}
            </p>
          </header>
          {error && (
            <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              onClick={() => setShowWizard(true)}
            >
              {t("marketing.email.connectCta")}
            </button>
            <Link
              href={`/dashboard/integrations/mailchimp?company=${encodeURIComponent(companyId)}${companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""}`}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              {t("marketing.email.openIntegrationDetail")}
            </Link>
          </div>
        </article>
        {showWizard && (
          <MailchimpConnectModal
            companyId={companyId}
            onClose={() => setShowWizard(false)}
            onConnected={onConnected}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.connectedHeader")}
          </p>
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">{config.accountName ?? "Mailchimp"}</span>
            {config.accountEmail ? (
              <span className="text-[var(--text-secondary)]"> · {config.accountEmail}</span>
            ) : null}
            <span className="ml-2 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
              {config.dc}
            </span>
          </p>
        </div>
        <Link
          href={`/dashboard/integrations/mailchimp?company=${encodeURIComponent(companyId)}${companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""}`}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          {t("marketing.email.manageConnection")}
        </Link>
      </header>

      <nav
        aria-label={t("marketing.email.subtabAria")}
        className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
        role="tablist"
      >
        {TABS.map((key) => {
          const isActive = key === tab;
          const href = `/dashboard/marketing/email?${baseSuffix ? `${baseSuffix}&` : ""}tab=${key}`;
          return (
            <Link
              key={key}
              href={href}
              aria-selected={isActive}
              role="tab"
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition ${
                isActive
                  ? "font-semibold text-[var(--text-primary)]"
                  : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t(`marketing.email.tabs.${key}` as never)}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div>
        {tab === "audiences" && <AudienceList companyId={companyId} />}
        {tab === "campaigns" && <CampaignList companyId={companyId} />}
        {tab === "templates" && <ComingSoonTab label={t("marketing.email.tabs.templates")} />}
        {tab === "reports" && <ComingSoonTab label={t("marketing.email.tabs.reports")} />}
        {tab === "settings" && <SettingsTab config={config} />}
      </div>
    </div>
  );
}

function EmptyShell({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)] sm:p-8">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {body ? <p className="mt-1">{body}</p> : null}
    </article>
  );
}

function ComingSoonTab({ label }: Readonly<{ label: string }>) {
  const t = useTranslations();
  return (
    <article className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-secondary)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{label}</h3>
      <p className="mt-2">{t("marketing.email.subtabComingSoon")}</p>
    </article>
  );
}

function SettingsTab({ config }: Readonly<{ config: MailchimpConfig }>) {
  const t = useTranslations();
  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {t("marketing.email.settingsTitle")}
      </h3>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("integrations.mailchimp.dcLabel")}
          </dt>
          <dd className="mt-0.5 font-mono text-[var(--text-primary)]">{config.dc}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            Account
          </dt>
          <dd className="mt-0.5 text-[var(--text-primary)]">
            {config.accountName ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            Email
          </dt>
          <dd className="mt-0.5 text-[var(--text-primary)]">
            {config.accountEmail ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("integrations.mailchimp.pushCountLabel")}
          </dt>
          <dd className="mt-0.5 text-[var(--text-primary)]">
            {config.pushCountSuccess} / {config.pushCountTotal}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.settingsHint")}
      </p>
    </article>
  );
}
