"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { AgencyList } from "./agency-list";

// AgenciesWorkspace — the Marketing → Agencies root. Pulls ?company=…
// from the URL (same convention every other marketing surface uses).
// Without a company in scope we render a hint so the operator hops back
// to /dashboard and picks one — same UX as the Email workspace.
export function AgenciesWorkspace() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";

  if (!companyId) {
    return (
      <article className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-8 text-sm text-[var(--text-secondary)]">
        {t("marketing.agencies.noCompany")}
      </article>
    );
  }
  return <AgencyList companyId={companyId} />;
}
