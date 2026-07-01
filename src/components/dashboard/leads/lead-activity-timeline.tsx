"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { listLeadActivities, type AuditEvent } from "@/lib/crm/client";
import { auditActionLabel, auditActorLabel, auditDetail } from "@/lib/audit/format";

import { formatDateTime } from "./lead-utils";

// Real audit timeline for one lead (replaces the old hardcoded 4-row summary).
// Reads the app-wide audit log filtered to this lead: who did what, when.
export function LeadActivityTimeline({ leadId }: Readonly<{ leadId: string }>) {
  const t = useTranslations();
  const translate = t as unknown as (key: string) => string;
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const r = await listLeadActivities(leadId, { limit: 50, offset: 0 });
      setEvents(r.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-[var(--text-tertiary)]">{t("audit.loading")}</p>;
  }
  if (failed) {
    return <p className="text-sm text-[var(--signal-red)]">{t("audit.loadFailed")}</p>;
  }
  if (events.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)]">{t("audit.empty")}</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => {
        const detail = auditDetail(event);
        return (
          <li key={event.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-strong)]"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {auditActionLabel(translate, event.action)}
                {detail ? (
                  <span className="font-normal text-[var(--text-secondary)]"> · {detail}</span>
                ) : null}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {auditActorLabel(translate, event)} · {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
