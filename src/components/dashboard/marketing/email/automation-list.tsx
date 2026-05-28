"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpAutomations,
  pauseAllMailchimpAutomation,
  startAllMailchimpAutomation,
  type MailchimpAutomation,
} from "@/lib/crm/client";

type AutomationListProps = {
  companyId: string;
};

// AutomationList shows Mailchimp's automations / Customer Journeys with
// a Pause-All / Start-All toggle per workflow. The designer itself stays
// in Mailchimp's UI (no API); we surface what API exposes so operators
// can pause a misbehaving journey from the CRM without context-switching.
export function AutomationList({ companyId }: Readonly<AutomationListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listMailchimpAutomations(companyId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.automations ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.automations.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refreshTick, t]);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  const handleStartAll = useCallback(
    async (workflow: MailchimpAutomation) => {
      try {
        await startAllMailchimpAutomation(companyId, workflow.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.automations.actionFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  const handlePauseAll = useCallback(
    async (workflow: MailchimpAutomation) => {
      try {
        await pauseAllMailchimpAutomation(companyId, workflow.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.automations.actionFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  if (loading) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("marketing.email.automations.loading")}
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
      <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("marketing.email.automations.title")} · {items.length}
        </h3>
        <button
          type="button"
          onClick={refresh}
          className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
        >
          {t("marketing.email.automations.refresh")}
        </button>
      </header>

      {(error || actionError) && (
        <p className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-sm text-[var(--signal-red)]">
          {error ?? actionError}
        </p>
      )}

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">
            {t("marketing.email.automations.emptyTitle")}
          </p>
          <p className="mt-1">{t("marketing.email.automations.emptyBody")}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.automations.col.title")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.automations.col.audience")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.automations.col.status")}
              </th>
              <th className="px-6 py-2 font-medium">
                {t("marketing.email.automations.col.emailsSent")}
              </th>
              <th className="px-6 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => {
              const isPaused = w.status === "paused" || w.status === "save";
              return (
                <tr key={w.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-6 py-3 text-[var(--text-primary)]">
                    <div className="font-medium">
                      {w.settings?.title ?? w.id}
                    </div>
                    <div className="font-mono text-xs text-[var(--text-tertiary)]">{w.id}</div>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-secondary)]">
                    {w.recipients?.list_name ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="px-6 py-3 text-[var(--text-primary)]">
                    {w.emails_sent?.toLocaleString() ?? "0"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={() => handleStartAll(w)}
                        className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--accent-strong)]"
                      >
                        {t("marketing.email.automations.actions.startAll")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePauseAll(w)}
                        className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                      >
                        {t("marketing.email.automations.actions.pauseAll")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="border-t border-[var(--border-subtle)] px-6 py-3 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.automations.designerHint")}
      </p>
    </article>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const color =
    status === "sending"
      ? "bg-[var(--signal-green-soft)] text-[var(--signal-green)]"
      : status === "paused" || status === "save"
        ? "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
        : "bg-[var(--signal-amber-soft)] text-[var(--signal-amber)]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
