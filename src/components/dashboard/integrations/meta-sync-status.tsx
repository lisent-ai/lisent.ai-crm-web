"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CRMClientError, listMetaDeliveries, type MetaDelivery } from "@/lib/crm/client";

type MetaSyncStatusProps = {
  companyId: string;
  refreshKey: number;
};

// MetaSyncStatus renders the last 100 inbound deliveries to the Meta
// integration. refreshKey is bumped by the parent (e.g. after sending a
// test lead) so we re-fetch without remounting.
export function MetaSyncStatus({ companyId, refreshKey }: Readonly<MetaSyncStatusProps>) {
  const t = useTranslations();
  const [rows, setRows] = useState<MetaDelivery[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listMetaDeliveries(companyId)
      .then((res) => {
        if (!cancelled) setRows(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError ? err.message : t("integrations.meta.loadFailed"),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refreshKey, t]);

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("integrations.meta.recentDeliveriesTitle")}
        </h3>
      </header>
      {error && (
        <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error}
        </p>
      )}
      {!error && rows && rows.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)]">
          {t("integrations.meta.recentDeliveriesEmpty")}
        </p>
      )}
      {!error && rows && rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
          {rows.map((row) => (
            <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={row.id}>
              <span className="font-mono text-xs text-[var(--text-tertiary)]">
                {new Date(row.createdAt).toLocaleString()}
              </span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                {row.leadgenId ?? "—"}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge(row.status)}`}>
                {t(`integrations.meta.deliveryStatus.${row.status}` as never)}
              </span>
              {row.errorMessage && (
                <span className="w-full truncate text-xs text-[var(--signal-red)]">
                  {row.errorMessage}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function statusBadge(status: MetaDelivery["status"]): string {
  switch (status) {
    case "accepted":
      return "bg-[#dcfce7] text-[#166534]";
    case "rejected":
      return "bg-[#fef3c7] text-[#92400e]";
    case "failed":
      return "bg-[#fee2e2] text-[#b91c1c]";
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-tertiary)]";
  }
}
