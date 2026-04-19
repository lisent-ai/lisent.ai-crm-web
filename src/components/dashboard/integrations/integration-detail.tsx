"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getAccountProfile } from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";

import { AIQualifierPanel } from "./ai-qualifier-panel";
import { GreenAPIConfigPanel } from "./greenapi-config";
import { IntranetConfigPanel } from "./intranet-config";

type Props = {
  slug: string;
};

const SLUG_TITLES: Record<string, string> = {
  "ai-lead-qualifier": "AI Lead Qualifier",
  greenapi: "Green API (WhatsApp)",
  intranet: "Intranet (Inbound Webhook)",
  // Legacy deep-link slugs — titles omitted because they resolve to the
  // unified AI Lead Qualifier panel with the matching tab pre-selected.
};

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

  const isOwner = useMemo(() => {
    if (!account || !companyId) return false;
    return account.access.companyMemberships.some(
      (m) => m.companyId === companyId && m.role === "owner",
    );
  }, [account, companyId]);

  const backHref = companyId
    ? `/dashboard/integrations?company=${encodeURIComponent(companyId)}&companyName=${encodeURIComponent(companyName)}`
    : "/dashboard/integrations";

  if (!account) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Loading your profile…
      </section>
    );
  }

  if (!companyId) {
    return (
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-600">
          No company selected. Return to the{" "}
          <Link className="font-semibold text-cyan-700 hover:underline" href="/dashboard/integrations">
            Integrations catalog
          </Link>{" "}
          and pick one first.
        </p>
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-800">
        <h1 className="text-2xl font-semibold tracking-tight text-rose-900">
          Access denied
        </h1>
        <p className="mt-3 leading-6">
          Integration management is restricted to the company owner.
        </p>
        <Link
          className="mt-6 inline-block rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
          href={backHref}
        >
          Back to catalog
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5">
        <Link
          className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700 hover:underline"
          href={backHref}
        >
          ← Back to integrations
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {SLUG_TITLES[slug] ?? slug}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Configuring{" "}
          <span className="font-semibold text-slate-900">
            {companyName || companyId}
          </span>
          .
        </p>
      </header>

      <SlugBody slug={slug} companyId={companyId} companyName={companyName} />
    </section>
  );
}

function SlugBody({ slug, companyId, companyName }: { slug: string; companyId: string; companyName: string }) {
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
    default:
      return (
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-700">
          Unknown integration slug: <code>{slug}</code>
        </article>
      );
  }
}
