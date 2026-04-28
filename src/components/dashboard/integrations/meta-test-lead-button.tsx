"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { CRMClientError, sendMetaTestLead } from "@/lib/crm/client";

type MetaTestLeadButtonProps = {
  companyId: string;
  companyName: string;
};

// MetaTestLeadButton renders a "Send test lead" button visible only when
// the integration is in mock mode. Posts a synthetic Meta-shaped payload
// through the CRM's mock injector, then deep-links to the resulting lead.
export function MetaTestLeadButton({
  companyId,
  companyName,
}: Readonly<MetaTestLeadButtonProps>) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ leadId: string; leadgenId: string } | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const result = await sendMetaTestLead(companyId, {});
      setLast(result);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : t("integrations.meta.testLeadFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const params = new URLSearchParams();
  if (companyId) params.set("company", companyId);
  if (companyName) params.set("companyName", companyName);
  params.set("source", "meta_test");

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
      <header>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("integrations.meta.testLeadTitle")}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("integrations.meta.testLeadDescription")}
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          onClick={handleClick}
          type="button"
        >
          {busy ? "…" : t("integrations.meta.testLeadButton")}
        </button>
        {last && (
          <Link
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-strong)] hover:underline"
            href={`/dashboard/leads?${params.toString()}`}
          >
            {t("integrations.meta.testLeadSent", { leadgen: last.leadgenId })} →
          </Link>
        )}
      </div>
      {error && (
        <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error}
        </p>
      )}
    </div>
  );
}
