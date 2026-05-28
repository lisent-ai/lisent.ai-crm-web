"use client";

import { useSearchParams } from "next/navigation";

import { AgencyList } from "./agency-list";

// AgenciesWorkspace — the Marketing → Agencies root. Pulls ?company=…
// from the URL (same convention every other marketing surface uses).
// Without a company in scope we render a hint so the operator hops back
// to /dashboard and picks one — same UX as the Email workspace.
export function AgenciesWorkspace() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";

  if (!companyId) {
    return (
      <article className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-8 text-sm text-[var(--text-secondary)]">
        Pick a company from the dashboard to manage its agencies.
      </article>
    );
  }
  return <AgencyList companyId={companyId} />;
}
