"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { listLeadActivities, type AuditEvent } from "@/lib/crm/client";
import {
  auditActionLabel,
  auditActorLabel,
  auditDetail,
  auditHasExpandableDetail,
} from "@/lib/audit/format";
import { AuditEventDetail } from "@/components/dashboard/audit/audit-log-workspace";

import { formatDateTime } from "./lead-utils";

const PAGE_SIZE = 50;

type Translate = (key: string, params?: Record<string, string | number>) => string;

// Real audit timeline for one lead (replaces the old hardcoded 4-row summary).
// Reads the app-wide audit log filtered to this lead: who did what, when —
// each entry expandable to the full payload (field diffs, webhook content).
export function LeadActivityTimeline({ leadId }: Readonly<{ leadId: string }>) {
  const t = useTranslations();
  const translate = t as unknown as Translate;
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const r = await listLeadActivities(leadId, { limit: PAGE_SIZE, offset: 0 });
      setEvents(r.data);
      setTotal(r.total);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setExpandedId(null);
    void load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const r = await listLeadActivities(leadId, { limit: PAGE_SIZE, offset: events.length });
      // Offset pagination can hand back rows we already show when new events
      // land between requests — dedupe by id to keep React keys unique.
      setEvents((current) => {
        const seen = new Set(current.map((event) => event.id));
        return [...current, ...r.data.filter((event) => !seen.has(event.id))];
      });
      setTotal(r.total);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-tertiary)]">{t("audit.loading")}</p>;
  }
  if (failed && events.length === 0) {
    return <p className="text-sm text-[var(--signal-red)]">{t("audit.loadFailed")}</p>;
  }
  if (events.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)]">{t("audit.empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {events.map((event) => {
          const detail = auditDetail(translate, event);
          const expandable = auditHasExpandableDetail(event);
          const expanded = expandedId === event.id;
          return (
            <li key={event.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-strong)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {auditActionLabel(translate, event.action)}
                    {detail ? (
                      <span className="font-normal text-[var(--text-secondary)]"> · {detail}</span>
                    ) : null}
                  </p>
                  {expandable ? (
                    <button
                      aria-expanded={expanded}
                      aria-label={expanded ? t("audit.details.hide") : t("audit.details.show")}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      onClick={() => setExpandedId(expanded ? null : event.id)}
                      type="button"
                    >
                      {expanded ? (
                        <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {auditActorLabel(translate, event)} · {formatDateTime(event.createdAt)}
                </p>
                {expanded ? (
                  <div className="mt-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3">
                    <AuditEventDetail event={event} translate={translate} />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {moreFailed ? (
        <p className="text-xs text-[var(--signal-red)]">{t("audit.loadFailed")}</p>
      ) : null}
      {events.length < total ? (
        <button
          className="self-start text-sm font-medium text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          type="button"
        >
          {loadingMore ? t("audit.loading") : t("audit.details.loadMore")}
        </button>
      ) : null}
    </div>
  );
}
