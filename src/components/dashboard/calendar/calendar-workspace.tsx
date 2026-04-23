"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  ListChecks,
  Plus,
  Search,
  Users,
  UserPlus,
} from "lucide-react";

import {
  CompanyMembershipClientError,
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";
import {
  CRMClientError,
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  listCompanies,
  listCustomers,
  listDeals,
  listLeads,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarLinkedEntityType,
  type Company,
  type Customer,
  type Deal,
  type Lead,
} from "@/lib/crm/client";

import {
  CalendarEventModal,
  type CalendarEventFormState,
} from "./calendar-event-modal";

type CalendarView = "month" | "week" | "agenda";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(value: Date) {
  return addDays(startOfDay(value), -startOfDay(value).getDay());
}

function endOfWeek(value: Date) {
  return endOfDay(addDays(startOfWeek(value), 6));
}

function startOfMonthGrid(value: Date) {
  return startOfWeek(new Date(value.getFullYear(), value.getMonth(), 1));
}

function endOfMonthGrid(value: Date) {
  return endOfWeek(new Date(value.getFullYear(), value.getMonth() + 1, 0));
}

function toISO(value: Date) {
  return value.toISOString();
}

function formatMonthTitle(value: Date) {
  return value.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatDayTitle(value: Date) {
  return value.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function buildDateInputValue(isoValue: string) {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateTimeInputValue(isoValue: string) {
  if (!isoValue) {
    return "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseInputToISO(value: string, allDay: boolean, end = false) {
  if (!value.trim()) {
    return "";
  }

  if (allDay) {
    const [year, month, day] = value.split("-").map((token) => Number.parseInt(token, 10));
    const date = end
      ? new Date(year, (month || 1) - 1, day || 1, 23, 59, 0, 0)
      : new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
    return date.toISOString();
  }

  return new Date(value).toISOString();
}

function defaultStartInput() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return buildDateTimeInputValue(now.toISOString());
}

function defaultEndInput(startValue: string) {
  if (!startValue) {
    return "";
  }
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  start.setHours(start.getHours() + 1);
  return buildDateTimeInputValue(start.toISOString());
}

function emptyForm(): CalendarEventFormState {
  const startAt = defaultStartInput();
  return {
    title: "",
    description: "",
    eventType: "follow_up",
    status: "scheduled",
    startAt,
    endAt: defaultEndInput(startAt),
    allDay: false,
    assigneeUserId: "",
    linkedEntityType: "",
    linkedEntityId: "",
    customerId: "",
    location: "",
    meetingUrl: "",
    reminderMinutesBefore: "15",
  };
}

function buildFormFromEvent(event: CalendarEvent): CalendarEventFormState {
  return {
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    status: event.status,
    startAt: event.allDay
      ? buildDateInputValue(event.startAt)
      : buildDateTimeInputValue(event.startAt),
    endAt: event.allDay
      ? buildDateInputValue(event.endAt || event.startAt)
      : buildDateTimeInputValue(event.endAt),
    allDay: event.allDay,
    assigneeUserId: event.assigneeUserId,
    linkedEntityType: event.linkedEntityType,
    linkedEntityId: event.linkedEntityId,
    customerId: event.customerId,
    location: event.location,
    meetingUrl: event.meetingUrl,
    reminderMinutesBefore:
      typeof event.reminderMinutesBefore === "number"
        ? String(event.reminderMinutesBefore)
        : "",
  };
}

function getEventTone(eventType: CalendarEventType) {
  switch (eventType) {
    case "call":
      return "border-[#e9d5ff] bg-[#faf5ff] text-[#6d28d9]";
    case "meeting":
      return "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]";
    case "demo":
      return "border-[#bbf7d0] bg-[#f0fdf4] text-[#047857]";
    case "deadline":
      return "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";
    default:
      return "border-[#fde68a] bg-[#fffbeb] text-[#b45309]";
  }
}

function buildMemberInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

type CalendarTab = {
  key: string;
  label: string;
  icon: typeof CalendarIcon;
  /** Which eventType to filter by; empty string means no filter (all). */
  filter: string;
};

const CALENDAR_TABS: CalendarTab[] = [
  { key: "all", label: "All Scheduled", icon: ClipboardList, filter: "all" },
  { key: "events", label: "Events", icon: CalendarDays, filter: "call" },
  { key: "meetings", label: "Meetings", icon: Users, filter: "meeting" },
  { key: "tasks", label: "Task Reminders", icon: ListChecks, filter: "follow_up" },
];

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const HOUR_HEIGHT_PX = 64;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, index) => DAY_START_HOUR + index,
);

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatRangeShort(start: Date, end: Date): string {
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: sameMonth ? undefined : "short",
  });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

type EventSlot = {
  top: number;
  height: number;
};

function computeEventSlot(event: CalendarEvent): EventSlot {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  if (Number.isNaN(start.getTime())) {
    return { top: 0, height: HOUR_HEIGHT_PX };
  }
  const startFrac = start.getHours() + start.getMinutes() / 60;
  const endFrac = Number.isNaN(end.getTime())
    ? startFrac + 1
    : end.getHours() + end.getMinutes() / 60;
  const clampedStart = Math.max(DAY_START_HOUR, Math.min(DAY_END_HOUR, startFrac));
  const clampedEnd = Math.max(clampedStart + 0.25, Math.min(DAY_END_HOUR + 1, endFrac));
  return {
    top: (clampedStart - DAY_START_HOUR) * HOUR_HEIGHT_PX,
    height: Math.max(36, (clampedEnd - clampedStart) * HOUR_HEIGHT_PX - 4),
  };
}

function formatRangeTime(event: CalendarEvent): string {
  if (event.allDay) return "All day";
  const start = new Date(event.startAt);
  const startLabel = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!event.endAt) return startLabel;
  const end = new Date(event.endAt);
  const endLabel = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startLabel} - ${endLabel}`;
}

export function CalendarWorkspace() {
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName") ?? "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [view, setView] = useState<CalendarView>("week");
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<CalendarEventFormState>(emptyForm);
  const [composeConsumed, setComposeConsumed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setActiveCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setErrorMessage(null);
      try {
        const nextCompanies = await listCompanies();
        if (!cancelled) {
          setCompanies(nextCompanies);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError
              ? error.message
              : "Failed to load companies.",
          );
        }
      }
    }

    void loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (companies.length === 0) {
      return;
    }
    setActiveCompanyId((current) => {
      if (current && companies.some((company) => company.id === current)) {
        return current;
      }
      return companies[0].id;
    });
  }, [companies]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

  const companyName = selectedCompany?.name ?? searchCompanyName ?? "Selected company";

  useEffect(() => {
    if (!selectedCompany?.id) {
      setCustomers([]);
      setLeads([]);
      setDeals([]);
      setMembers([]);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [nextCustomers, nextLeads, nextDeals, nextMembers] = await Promise.all([
          listCustomers(companyId).catch(() => []),
          listLeads(companyId).catch(() => []),
          listDeals(companyId).catch(() => []),
          listCompanyMembers(companyId).catch((error) => {
            if (error instanceof CompanyMembershipClientError) {
              return [];
            }
            throw error;
          }),
        ]);

        if (!cancelled) {
          setCustomers(nextCustomers);
          setLeads(nextLeads);
          setDeals(nextDeals);
          setMembers(nextMembers);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setLeads([]);
          setDeals([]);
          setMembers([]);
        }
      }
    }

    void loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id]);

  const range = useMemo(() => {
    if (view === "week") {
      return {
        start: startOfWeek(activeDate),
        end: endOfWeek(activeDate),
      };
    }
    if (view === "agenda") {
      return {
        start: startOfDay(activeDate),
        end: endOfDay(addDays(activeDate, 30)),
      };
    }
    return {
      start: startOfMonthGrid(activeDate),
      end: endOfMonthGrid(activeDate),
    };
  }, [activeDate, view]);

  async function reloadEvents(companyId: string) {
    const nextEvents = await listCalendarEvents({
      companyId,
      assigneeUserId: assigneeFilter === "all" ? "" : assigneeFilter,
      eventType: eventTypeFilter === "all" ? "" : eventTypeFilter,
      startFrom: toISO(range.start),
      startTo: toISO(range.end),
    });
    setEvents(nextEvents);
    return nextEvents;
  }

  useEffect(() => {
    if (!selectedCompany?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const companyId = selectedCompany.id;
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const nextEvents = await listCalendarEvents({
          companyId,
          assigneeUserId: assigneeFilter === "all" ? "" : assigneeFilter,
          eventType: eventTypeFilter === "all" ? "" : eventTypeFilter,
          startFrom: toISO(range.start),
          startTo: toISO(range.end),
        });
        if (!cancelled) {
          setEvents(nextEvents);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof CRMClientError
              ? error.message
              : "Failed to load calendar events.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [assigneeFilter, eventTypeFilter, range.end, range.start, selectedCompany?.id]);

  useEffect(() => {
    if (!selectedCompany || composeConsumed) {
      return;
    }

    if (searchParams.get("compose") !== "1") {
      return;
    }

    const linkedEntityType = (searchParams.get("linkedType")?.trim() ||
      "") as CalendarLinkedEntityType;
    const linkedEntityId = searchParams.get("linkedId")?.trim() || "";
    const title = searchParams.get("title")?.trim() || "";
    const eventType = (searchParams.get("eventType")?.trim() ||
      "follow_up") as CalendarEventType;
    const customerId = searchParams.get("customerId")?.trim() || "";

    setForm({
      ...emptyForm(),
      title,
      eventType,
      linkedEntityType,
      linkedEntityId:
        linkedEntityType === "company" ? selectedCompany.id : linkedEntityId,
      customerId,
    });
    setEditingEventId(null);
    setShowModal(true);
    setComposeConsumed(true);
  }, [composeConsumed, searchParams, selectedCompany]);

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [range.end, range.start]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(activeDate), index)),
    [activeDate],
  );

  const customerLabelById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.name || customer.email])),
    [customers],
  );
  const leadLabelById = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead.name || lead.email || lead.id])),
    [leads],
  );
  const dealLabelById = useMemo(
    () => new Map(deals.map((deal) => [deal.id, deal.name || deal.id])),
    [deals],
  );
  const memberLabelById = useMemo(
    () => new Map(members.map((member) => [member.userId, member.displayName])),
    [members],
  );

  function getLinkedLabel(event: CalendarEvent) {
    switch (event.linkedEntityType) {
      case "lead":
        return leadLabelById.get(event.linkedEntityId) || "Linked lead";
      case "deal":
        return dealLabelById.get(event.linkedEntityId) || "Linked deal";
      case "customer":
        return customerLabelById.get(event.linkedEntityId) || "Linked customer";
      case "company":
        return companyName;
      default:
        return "";
    }
  }

function openCreateModal(date?: Date) {
    const nextForm = emptyForm();
    if (date) {
      const start = startOfDay(date);
      const end = new Date(start);
      end.setHours(1, 0, 0, 0);
      nextForm.startAt = buildDateTimeInputValue(start.toISOString());
      nextForm.endAt = buildDateTimeInputValue(end.toISOString());
    }
    setEditingEventId(null);
    setForm(nextForm);
    setShowModal(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEditingEventId(event.id);
    setForm(buildFormFromEvent(event));
    setShowModal(true);
  }

  function closeModal() {
    setEditingEventId(null);
    setForm(emptyForm());
    setShowModal(false);
  }

  async function handleSave() {
    if (!selectedCompany) {
      return;
    }

    const title = form.title.trim();
    if (!title) {
      setErrorMessage("Event title is required.");
      return;
    }
    if (!form.startAt.trim()) {
      setErrorMessage("Start time is required.");
      return;
    }
    if (form.linkedEntityType && !form.linkedEntityId.trim()) {
      setErrorMessage("Please choose the record you want to link.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const assignee =
        members.find((member) => member.userId === form.assigneeUserId) ?? null;
      const startAt = parseInputToISO(form.startAt, form.allDay, false);
      const endAt = form.endAt.trim()
        ? parseInputToISO(form.endAt, form.allDay, true)
        : "";

      const payload = {
        companyId: selectedCompany.id,
        customerId:
          form.customerId.trim() ||
          (form.linkedEntityType === "customer" ? form.linkedEntityId.trim() : ""),
        title,
        description: form.description,
        eventType: form.eventType,
        status: form.status,
        startAt,
        endAt,
        allDay: form.allDay,
        assigneeUserId: form.assigneeUserId,
        assigneeUserName:
          assignee?.displayName ||
          memberLabelById.get(form.assigneeUserId) ||
          "",
        linkedEntityType: form.linkedEntityType,
        linkedEntityId:
          form.linkedEntityType === "company"
            ? selectedCompany.id
            : form.linkedEntityId.trim(),
        location: form.location,
        meetingUrl: form.meetingUrl,
        reminderMinutesBefore: form.reminderMinutesBefore.trim()
          ? Number.parseInt(form.reminderMinutesBefore, 10)
          : null,
        extraData: {},
      };

      if (editingEventId) {
        await updateCalendarEvent(editingEventId, payload);
      } else {
        await createCalendarEvent(payload);
      }

      await reloadEvents(selectedCompany.id);
      setSuccessMessage(
        editingEventId ? "Calendar event updated." : "Calendar event created.",
      );
      closeModal();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError
          ? error.message
          : "Failed to save calendar event.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingEventId || !selectedCompany) {
      return;
    }

    const confirmed = window.confirm("Delete this calendar event?");
    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteCalendarEvent(editingEventId);
      await reloadEvents(selectedCompany.id);
      setSuccessMessage("Calendar event deleted.");
      closeModal();
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError
          ? error.message
          : "Failed to delete calendar event.",
      );
    } finally {
      setSaving(false);
    }
  }

  function moveRange(direction: -1 | 1) {
    if (view === "week") {
      setActiveDate((current) => addDays(current, direction * 7));
      return;
    }
    if (view === "agenda") {
      setActiveDate((current) => addDays(current, direction * 30));
      return;
    }
    setActiveDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  const visibleEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) => {
      const haystack = [
        event.title,
        event.description,
        event.location,
        event.meetingUrl,
        getLinkedLabel(event),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
    // getLinkedLabel depends on label maps but this is a cheap client filter;
    // re-computing on every keystroke is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, searchQuery, customerLabelById, leadLabelById, dealLabelById, companyName]);

  const visibleEventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of visibleEvents) {
      const dayKey = buildDateInputValue(event.startAt);
      map.set(dayKey, [...(map.get(dayKey) ?? []), event]);
    }
    for (const [key, value] of map.entries()) {
      map.set(
        key,
        [...value].sort((a, b) => a.startAt.localeCompare(b.startAt)),
      );
    }
    return map;
  }, [visibleEvents]);

  const filteredAgendaEvents = useMemo(
    () => [...visibleEvents].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [visibleEvents],
  );

  const activeTabKey =
    CALENDAR_TABS.find((tab) => tab.filter === eventTypeFilter)?.key ?? "all";
  const viewLabel = view === "agenda" ? "Day" : view === "week" ? "Week" : "Month";
  const avatars = members.slice(0, 3);
  const extraAvatarCount = Math.max(0, members.length - avatars.length);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Stay organized and on track with your personalized calendar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {avatars.length > 0 && (
            <div className="flex items-center">
              {avatars.map((member) => (
                <span
                  aria-hidden="true"
                  className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[linear-gradient(135deg,_#6366f1,_#8b5cf6)] text-[11px] font-semibold text-white first:ml-0"
                  key={member.userId}
                  title={member.displayName}
                >
                  {buildMemberInitials(member.displayName)}
                </span>
              ))}
              {extraAvatarCount > 0 && (
                <span
                  aria-hidden="true"
                  className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-inset)] text-[11px] font-semibold text-[var(--text-secondary)]"
                >
                  +{extraAvatarCount}
                </span>
              )}
            </div>
          )}
          <button
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            type="button"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invite
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] md:flex-row md:items-center md:justify-between">
        <nav aria-label="Calendar filters" className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto">
          {CALENDAR_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeTabKey;
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition ${
                  active
                    ? "font-semibold text-[var(--text-primary)]"
                    : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                key={tab.key}
                onClick={() => setEventTypeFilter(tab.filter)}
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 pb-3 md:pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
            <input
              aria-label="Search calendar"
              className="h-9 w-[180px] rounded-full border border-[var(--border-default)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus:outline-none lg:w-[220px]"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search..."
              type="search"
              value={searchQuery}
            />
          </div>

          <div className="relative">
            <button
              aria-expanded={filterOpen}
              aria-haspopup="menu"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              onClick={() => setFilterOpen((prev) => !prev)}
              type="button"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
              {assigneeFilter !== "all" && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] font-semibold text-[var(--accent-strong)]">
                  1
                </span>
              )}
            </button>
            {filterOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[var(--shadow-float)]"
                role="menu"
              >
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Assignee
                </p>
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--border-strong)]"
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                  value={assigneeFilter}
                >
                  <option value="all">All assignees</option>
                  {members
                    .filter((member) => member.role !== "viewer")
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))
                    .map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.displayName}
                      </option>
                    ))}
                </select>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    className="rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)]"
                    onClick={() => {
                      setAssigneeFilter("all");
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className="rounded-full bg-[var(--text-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                    onClick={() => setFilterOpen(false)}
                    type="button"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            disabled={!selectedCompany || saving}
            onClick={() => openCreateModal()}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-green)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {formatMonthTitle(activeDate)}
          </h2>
          <button
            className="inline-flex h-8 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            onClick={() => setActiveDate(new Date())}
            type="button"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface)] p-0.5">
            {(
              [
                { label: "Day", value: "agenda" },
                { label: "Week", value: "week" },
                { label: "Month", value: "month" },
              ] as { label: string; value: CalendarView }[]
            ).map((option) => {
              const active = option.value === view;
              return (
                <button
                  className={`h-7 rounded-full px-3 text-xs font-medium transition ${
                    active
                      ? "bg-[var(--text-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  key={option.value}
                  onClick={() => setView(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <span className="hidden h-8 items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-secondary)] sm:inline-flex">
            <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {formatRangeShort(range.start, range.end)}
          </span>
        </div>
      </div>

      <section className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-2 shadow-[var(--shadow-card)] md:p-3">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center px-4 text-sm text-[var(--text-tertiary)]">
            Loading calendar…
          </div>
        ) : view === "week" ? (
          <WeekGrid
            activeDate={activeDate}
            eventsByDay={visibleEventsByDay}
            getLinkedLabel={getLinkedLabel}
            onCreate={openCreateModal}
            onEdit={openEditModal}
            onNext={() => moveRange(1)}
            onPrev={() => moveRange(-1)}
            viewLabel={viewLabel}
            weekDays={weekDays}
          />
        ) : view === "month" ? (
          <MonthGrid
            activeDate={activeDate}
            eventsByDay={visibleEventsByDay}
            monthDays={monthDays}
            onCreate={openCreateModal}
            onEdit={openEditModal}
          />
        ) : (
          <AgendaList
            events={filteredAgendaEvents}
            getLinkedLabel={getLinkedLabel}
            memberLabelById={memberLabelById}
            onEdit={openEditModal}
          />
        )}
      </section>

      {showModal && selectedCompany ? (
        <CalendarEventModal
          company={selectedCompany}
          customers={customers}
          deals={deals}
          editing={Boolean(editingEventId)}
          form={form}
          leads={leads}
          members={members}
          onClose={closeModal}
          onDelete={editingEventId ? () => void handleDelete() : null}
          onFormChange={setForm}
          onSave={() => void handleSave()}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

type WeekGridProps = {
  weekDays: Date[];
  activeDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onPrev: () => void;
  onNext: () => void;
  onCreate: (date?: Date) => void;
  onEdit: (event: CalendarEvent) => void;
  getLinkedLabel: (event: CalendarEvent) => string;
  viewLabel: string;
};

function WeekGrid({
  weekDays,
  activeDate,
  eventsByDay,
  onPrev,
  onNext,
  onCreate,
  onEdit,
  getLinkedLabel,
  viewLabel,
}: Readonly<WeekGridProps>) {
  const todayKey = buildDateInputValue(new Date().toISOString());
  const activeKey = buildDateInputValue(activeDate.toISOString());

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)]">
      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <div className="flex items-center justify-center gap-1 px-2 py-3">
          <button
            aria-label={`Previous ${viewLabel.toLowerCase()}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onPrev}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label={`Next ${viewLabel.toLowerCase()}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {weekDays.map((day) => {
          const key = buildDateInputValue(day.toISOString());
          const isToday = key === todayKey;
          const isActive = key === activeKey;
          const label = day
            .toLocaleDateString("en-GB", { weekday: "short" })
            .toUpperCase();
          return (
            <div
              className={`relative flex items-center gap-2 border-l border-[var(--border-subtle)] px-3 py-3 ${
                isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
              }`}
              key={key}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                {label} {day.getDate()}
              </span>
              {isToday && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                />
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="scrollbar-thin max-h-[620px] overflow-y-auto">
        <div
          className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]"
          style={{ height: `${HOURS.length * HOUR_HEIGHT_PX}px` }}
        >
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                className="flex items-start justify-end pr-3 pt-1 text-[11px] font-medium text-[var(--text-tertiary)]"
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>
          {weekDays.map((day) => {
            const key = buildDateInputValue(day.toISOString());
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <button
                aria-label={`Create event on ${day.toLocaleDateString()}`}
                className="relative cursor-pointer border-l border-[var(--border-subtle)] text-left"
                key={key}
                onClick={(event) => {
                  // Only open create when clicking empty slot area (not an event).
                  if ((event.target as HTMLElement).closest("[data-event-card]")) return;
                  onCreate(day);
                }}
                type="button"
              >
                {HOURS.map((hour) => (
                  <div
                    className="border-b border-[var(--border-subtle)]"
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT_PX}px` }}
                  />
                ))}
                {dayEvents.map((event) => {
                  const slot = computeEventSlot(event);
                  const linked = getLinkedLabel(event);
                  return (
                    <button
                      className={`absolute left-1 right-1 flex flex-col gap-1 rounded-[10px] border px-2 py-1.5 text-left transition hover:brightness-95 ${getEventTone(
                        event.eventType,
                      )}`}
                      data-event-card="true"
                      key={event.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEdit(event);
                      }}
                      style={{ top: `${slot.top}px`, height: `${slot.height}px` }}
                      type="button"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80">
                        {formatRangeTime(event)}
                      </span>
                      <span className="line-clamp-2 text-[12px] font-semibold leading-tight">
                        {event.title || "Untitled"}
                      </span>
                      {linked && slot.height > 60 ? (
                        <span className="truncate text-[10px] opacity-70">{linked}</span>
                      ) : null}
                    </button>
                  );
                })}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type MonthGridProps = {
  monthDays: Date[];
  activeDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onCreate: (date?: Date) => void;
  onEdit: (event: CalendarEvent) => void;
};

function MonthGrid({
  monthDays,
  activeDate,
  eventsByDay,
  onCreate,
  onEdit,
}: Readonly<MonthGridProps>) {
  const todayKey = buildDateInputValue(new Date().toISOString());

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)]">
      <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
        {weekdayLabels.map((label) => (
          <div
            className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]"
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map((day) => {
          const key = buildDateInputValue(day.toISOString());
          const dayEvents = eventsByDay.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === activeDate.getMonth();
          const isToday = key === todayKey;

          return (
            <div
              className={`group relative flex min-h-[120px] flex-col gap-2 border-b border-l border-[var(--border-subtle)] p-2 ${
                isCurrentMonth ? "bg-[var(--surface)]" : "bg-[var(--surface-subtle)]"
              }`}
              key={key}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? "bg-[var(--text-primary)] text-white"
                      : isCurrentMonth
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {day.getDate()}
                </span>
                <button
                  aria-label={`Add event on ${day.toLocaleDateString()}`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-tertiary)] opacity-0 transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] group-hover:opacity-100"
                  onClick={() => onCreate(day)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    className={`w-full truncate rounded-md border px-2 py-1 text-left text-[11px] font-medium transition hover:brightness-95 ${getEventTone(
                      event.eventType,
                    )}`}
                    key={event.id}
                    onClick={() => onEdit(event)}
                    type="button"
                  >
                    {event.title || "Untitled"}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AgendaListProps = {
  events: CalendarEvent[];
  memberLabelById: Map<string, string>;
  getLinkedLabel: (event: CalendarEvent) => string;
  onEdit: (event: CalendarEvent) => void;
};

function AgendaList({
  events,
  memberLabelById,
  getLinkedLabel,
  onEdit,
}: Readonly<AgendaListProps>) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 text-center text-sm text-[var(--text-tertiary)]">
        No upcoming activity in this range.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => {
        const linked = getLinkedLabel(event);
        const assignee =
          memberLabelById.get(event.assigneeUserId) || event.assigneeUserName || "";
        return (
          <button
            className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] md:flex-row md:items-center md:justify-between"
            key={event.id}
            onClick={() => onEdit(event)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[11px] font-semibold uppercase ${getEventTone(
                  event.eventType,
                )}`}
              >
                {event.eventType.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {event.title || "Untitled"}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {formatDayTitle(new Date(event.startAt))} · {formatRangeTime(event)}
                  {linked ? ` · ${linked}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                {event.status}
              </span>
              {assignee && (
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                  {assignee}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
