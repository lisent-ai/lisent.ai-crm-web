"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { getAccountProfile } from "@/lib/account/client";
import { hasCompanyPermissionInAccess } from "@/lib/auth/access-control";
import type { AccountProfile } from "@/lib/auth/account-profile";

import { AIQualifierPanel } from "./ai-qualifier-panel";
import { GoogleSheetsConfigPanel } from "./google-sheets/google-sheets-config";
import { GreenAPIConfigPanel } from "./greenapi-config";
import { IntranetConfigPanel } from "./intranet-config";
import { MetaConfigPanel } from "./meta-config";

type Props = {
  slug: string;
};

// Slug titles map to integrations.detail.slugTitles.* (resolved in component
// via useTranslations). Provider names like "AI Lead Qualifier", "Green API",
// "Intranet" are brand identifiers — the wrapper text is i18n only.

/** Map legacy slugs to the tab they used to be. */
const LEGACY_SLUG_TO_TAB: Record<string, "lead-webhook" | "rag" | "fallback" | "ai-config"> = {
  "qualifier-lead-webhook": "lead-webhook",
  "qualifier-rag-webhook": "rag",
  "qualifier-fallback": "fallback",
  "qualifier-ai-config": "ai-config",
};

/**
 * Detail page for a single integration slug. Faz 5 wires GreenAPI + three
 * Qualifier subpages to the real config panels; Faz 6 and Faz 7 add RAG and
 * Intranet panels alongside these.
 */
export function IntegrationDetail({ slug }: Readonly<Props>) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";
  const [account, setAccount] = useState<AccountProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAccountProfile()
      .then((p) => {
        if (!cancelled) setAccount(p);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canManage = useMemo(() => {
    if (!account || !companyId) return false;
    return hasCompanyPermissionInAccess(
      account.access,
      companyId,
      "integrations.manage",
    );
  }, [account, companyId]);

  const backHref = companyId
    ? `/dashboard/integrations?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`
    : "/dashboard/integrations";

  if (!account) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)] sm:p-8">
        {t("integrations.loadingProfile")}
      </section>
    );
  }

  if (!companyId) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
        <p className="text-sm text-[var(--text-secondary)]">
          {t.rich("integrations.detail.noCompany", {
            link: (chunks) => (
              <Link className="font-semibold text-[var(--accent-strong)] hover:underline" href="/dashboard/integrations">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)] sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
          {t("integrations.detail.restrictedTitle")}
        </h1>
        <p className="mt-3 leading-6">
          {t("integrations.detail.restrictedDescription")}
        </p>
        <Link
          className="mt-6 inline-block rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          href={backHref}
        >
          {t("integrations.detail.backToCatalog")}
        </Link>
      </section>
    );
  }

  const SLUG_KEY_MAP: Record<string, string> = {
    "ai-lead-qualifier": "integrations.detail.slugTitles.aiLeadQualifier",
    greenapi: "integrations.detail.slugTitles.greenapi",
    intranet: "integrations.detail.slugTitles.intranet",
    "meta-lead-ads": "integrations.detail.slugTitles.metaLeadAds",
  };
  // Static title for the Google Sheets card — i18n keys to follow when the
  // translations file is updated. Slug shows up untranslated until then.
  const slugTitle =
    slug === "google-sheets"
      ? "Google Sheets"
      : SLUG_KEY_MAP[slug]
        ? t(SLUG_KEY_MAP[slug] as never)
        : slug;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-5 sm:px-6">
        <Link
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)] hover:underline"
          href={backHref}
        >
          {t("integrations.detail.backLink")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {slugTitle}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t.rich("integrations.detail.configuringCompany", {
            name: companyName || companyId,
            strong: (chunks) => (
              <span className="font-semibold text-[var(--text-primary)]">{chunks}</span>
            ),
          })}
        </p>
      </header>

      <SlugBody slug={slug} companyId={companyId} companyName={companyName} />
    </section>
  );
}

function SlugBody({ slug, companyId, companyName }: { slug: string; companyId: string; companyName: string }) {
  const t = useTranslations();
  // Legacy deep-link slugs → unified qualifier panel with the matching tab.
  const legacyTab = LEGACY_SLUG_TO_TAB[slug];
  if (legacyTab) {
    return (
      <AIQualifierPanel
        companyId={companyId}
        companyName={companyName}
        initialTab={legacyTab}
      />
    );
  }

  switch (slug) {
    case "ai-lead-qualifier":
      return <AIQualifierPanel companyId={companyId} companyName={companyName} />;
    case "greenapi":
      return <GreenAPIConfigPanel companyId={companyId} />;
    case "intranet":
      return <IntranetConfigPanel companyId={companyId} />;
    case "meta-lead-ads":
      return <MetaConfigPanel companyId={companyId} />;
    case "google-sheets":
      return <GoogleSheetsConfigPanel companyId={companyId} />;
    default:
      return (
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)] sm:p-8">
          {t("integrations.detail.unknownSlug")}: <code className="font-mono text-[var(--text-primary)]">{slug}</code>
        </article>
      );
  }
}
