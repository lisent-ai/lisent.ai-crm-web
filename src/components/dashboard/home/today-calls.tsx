"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Phone, PhoneCall } from "lucide-react";

import {
  CRMClientError,
  type CalendarEvent,
  type Lead,
  listCalendarEvents,
  listLeads,
  updateCalendarEvent,
} from "@/lib/crm/client";

// "People to call today" surfaces scheduled call / follow-up calendar
// events that are due by end of day (overdue ones included) for the
// active workspace. Feeds off the same calendar_events the inline
// follow-up presets create.
const CALL_EVENT_TYPES = new Set<CalendarEvent["eventType"]>(["call", "follow_up"]);

type TodayCallsProps = {
  companyId: string;
  companyName: string;
};

export function TodayCalls({ companyId, companyName }: Readonly<TodayCallsProps>) {
  const t = useTranslations();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leadsById, setLeadsById] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setEvents([]);
      setLeadsById({});
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      try {
        // End of today (local) caps the window; omitting start_from also
        // pulls overdue still-scheduled calls, which still need a call.
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const [eventsRes, leadsRes] = await Promise.all([
          listCalendarEvents({
            companyId,
            status: "scheduled",
            startTo: endOfToday.toISOString(),
          }),
          listLeads(companyId).catch(() => [] as Lead[]),
        ]);
        if (cancelled) return;
        setEvents(eventsRes);
        setLeadsById(Object.fromEntries(leadsRes.map((lead) => [lead.id, lead])));
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof CRMClientError ? error.message : t("home.todayCalls.loadFailed"),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const callEvents = useMemo(
    () =>
      events
        .filter((event) => CALL_EVENT_TYPES.has(event.eventType))
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [events],
  );

  async function markDone(event: CalendarEvent) {
    setBusyId(event.id);
    setErrorMessage(null);
    try {
      await updateCalendarEvent(event.id, {
        companyId: event.companyId,
        customerId: event.customerId,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        status: "completed",
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        assigneeUserId: event.assigneeUserId,
        assigneeUserName: event.assigneeUserName,
        linkedEntityType: event.linkedEntityType,
        linkedEntityId: event.linkedEntityId,
        location: event.location,
        meetingUrl: event.meetingUrl,
        reminderMinutesBefore: event.reminderMinutesBefore,
        extraData: event.extraData,
      });
      setEvents((current) => current.filter((item) => item.id !== event.id));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("home.todayCalls.markDoneFailed"),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
            <PhoneCall className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {t("home.todayCalls.title")}
          </p>
        </div>
        {companyId && callEvents.length > 0 ? (
          <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-strong)]">
            {callEvents.length}
          </span>
        ) : null}
      </div>

      {!companyId ? (
        <EmptyRow message={t("home.todayCalls.selectWorkspace")} />
      ) : errorMessage ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : loading && callEvents.length === 0 ? (
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-muted)]"
            />
          ))}
        </div>
      ) : callEvents.length === 0 ? (
        <EmptyRow message={t("home.todayCalls.empty")} />
      ) : (
        <ul className="mt-4 grid gap-2">
          {callEvents.map((event) => {
            const lead = event.linkedEntityId ? leadsById[event.linkedEntityId] : undefined;
            const name = lead?.name || event.title || t("leads.fallback.lead");
            const overdue = new Date(event.startAt).getTime() < Date.now();
            // Click the row → open this lead's detail card on the leads page
            // (the full drawer lives there; we deep-link with ?lead=<id>).
            const leadHref = lead
              ? `/dashboard/leads?company=${encodeURIComponent(companyId)}${
                  companyName ? `&companyName=${encodeURIComponent(companyName)}` : ""
                }&lead=${encodeURIComponent(lead.id)}`
              : null;
            const rowBody = (
              <>
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  {formatTime(event.startAt)}
                  {overdue ? (
                    <span className="ms-2 inline-flex items-center rounded-full bg-[color-mix(in_srgb,_var(--signal-red)_14%,_var(--surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal-red)]">
                      {t("home.todayCalls.overdue")}
                    </span>
                  ) : null}
                </p>
              </>
            );
            return (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3"
              >
                {leadHref ? (
                  <Link
                    href={leadHref}
                    className="-mx-1 min-w-0 flex-1 rounded-lg px-1 transition hover:bg-[var(--surface-muted)]"
                  >
                    {rowBody}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{rowBody}</div>
                )}
                <div className="flex items-center gap-2">
                  {lead?.phone ? (
                    <a
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                      href={`tel:${lead.phone}`}
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("home.todayCalls.call")}
                    </a>
                  ) : null}
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    disabled={busyId === event.id}
                    onClick={() => void markDone(event)}
                    type="button"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("home.todayCalls.markDone")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyRow({ message }: Readonly<{ message: string }>) {
  return (
    <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
      {message}
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
