"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) {
    return "All day";
  }

  return new Date(event.startAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
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
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "meeting":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "demo":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "deadline":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
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
  const [view, setView] = useState<CalendarView>("month");
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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dayKey = buildDateInputValue(event.startAt);
      map.set(dayKey, [...(map.get(dayKey) ?? []), event]);
    }
    for (const [key, value] of map.entries()) {
      map.set(
        key,
        [...value].sort((left, right) => left.startAt.localeCompare(right.startAt)),
      );
    }
    return map;
  }, [events]);

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

  const agendaEvents = useMemo(
    () => [...events].sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [events],
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

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700/80">
              Calendar
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              CRM activity calendar
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Track follow-ups, meetings, demos, and deadlines tied directly to your
              leads, deals, customers, and company work.
            </p>
          </div>

          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#164e63)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:opacity-50"
            disabled={!selectedCompany || saving}
            onClick={() => openCreateModal()}
            type="button"
          >
            New event
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Company
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{companyName}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Visible range
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {view === "month"
                ? formatMonthTitle(activeDate)
                : `${formatDayTitle(range.start)} - ${formatDayTitle(range.end)}`}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Scheduled
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {events.filter((event) => event.status === "scheduled").length}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Assigned
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {events.filter((event) => event.assigneeUserId).length}
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[1.3rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              onClick={() => moveRange(-1)}
              type="button"
            >
              Prev
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              onClick={() => setActiveDate(new Date())}
              type="button"
            >
              Today
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              onClick={() => moveRange(1)}
              type="button"
            >
              Next
            </button>
            <span className="ml-2 text-sm font-semibold text-slate-950">
              {view === "month"
                ? formatMonthTitle(activeDate)
                : `${formatDayTitle(range.start)} - ${formatDayTitle(range.end)}`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["month", "week", "agenda"] as CalendarView[]).map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  view === item
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                }`}
                key={item}
                onClick={() => setView(item)}
                type="button"
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Event type
            <select
              className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => setEventTypeFilter(event.target.value)}
              value={eventTypeFilter}
            >
              <option value="all">All types</option>
              <option value="follow_up">Follow-up</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="demo">Demo</option>
              <option value="deadline">Deadline</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Assignee
            <select
              className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => setAssigneeFilter(event.target.value)}
              value={assigneeFilter}
            >
              <option value="all">All assignees</option>
              {members
                .filter((member) => member.role !== "viewer")
                .sort((left, right) => left.displayName.localeCompare(right.displayName))
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              Loading calendar...
            </div>
          ) : view === "month" ? (
            <div className="overflow-hidden rounded-[1.3rem] border border-slate-200">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekdayLabels.map((label) => (
                  <div
                    className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
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
                  const isToday =
                    buildDateInputValue(day.toISOString()) ===
                    buildDateInputValue(new Date().toISOString());

                  return (
                    <div
                      className={`min-h-44 border-b border-r border-slate-200 p-3 ${!isCurrentMonth ? "bg-slate-50/80" : "bg-white"}`}
                      key={key}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                            isToday
                              ? "bg-slate-900 text-white"
                              : "text-slate-700"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <button
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                          onClick={() => openCreateModal(day)}
                          type="button"
                        >
                          +
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {dayEvents.length === 0 ? (
                          <p className="text-xs leading-5 text-slate-400">No CRM activity.</p>
                        ) : (
                          dayEvents.map((event) => (
                            <button
                              className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition hover:brightness-95 ${getEventTone(
                                event.eventType,
                              )}`}
                              key={event.id}
                              onClick={() => openEditModal(event)}
                              type="button"
                            >
                              <p>{formatEventTime(event)}</p>
                              <p className="mt-1 truncate text-sm font-semibold">{event.title}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === "week" ? (
            <div className="grid gap-4 lg:grid-cols-7">
              {weekDays.map((day) => {
                const key = buildDateInputValue(day.toISOString());
                const dayEvents = eventsByDay.get(key) ?? [];
                const isToday =
                  buildDateInputValue(day.toISOString()) ===
                  buildDateInputValue(new Date().toISOString());

                return (
                  <section
                    className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-3"
                    key={key}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {weekdayLabels[day.getDay()]}
                        </p>
                        <p
                          className={`mt-2 text-lg font-semibold ${
                            isToday ? "text-cyan-700" : "text-slate-950"
                          }`}
                        >
                          {day.getDate()}
                        </p>
                      </div>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                        onClick={() => openCreateModal(day)}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {dayEvents.length === 0 ? (
                        <p className="text-xs leading-5 text-slate-400">No activity.</p>
                      ) : (
                        dayEvents.map((event) => (
                          <button
                            className={`rounded-xl border px-3 py-2 text-left transition hover:brightness-95 ${getEventTone(
                              event.eventType,
                            )}`}
                            key={event.id}
                            onClick={() => openEditModal(event)}
                            type="button"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                              {formatEventTime(event)}
                            </p>
                            <p className="mt-1 text-sm font-semibold">{event.title}</p>
                            {getLinkedLabel(event) ? (
                              <p className="mt-1 text-xs opacity-80">{getLinkedLabel(event)}</p>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3">
              {agendaEvents.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  No upcoming CRM activity in this range.
                </div>
              ) : (
                agendaEvents.map((event) => (
                  <article
                    className="rounded-[1.2rem] border border-slate-200 bg-[linear-gradient(145deg,_#ffffff,_#f8fafc)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                    key={event.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {formatDayTitle(new Date(event.startAt))}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {event.description || "No description recorded."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getEventTone(
                            event.eventType,
                          )}`}
                        >
                          {event.eventType.replace("_", " ")}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {event.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          When
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {event.allDay
                            ? "All day"
                            : `${formatEventTime(event)}${event.endAt ? ` - ${new Date(event.endAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
                        </p>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Assignee
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {memberLabelById.get(event.assigneeUserId) ||
                            event.assigneeUserName ||
                            "Unassigned"}
                        </p>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Linked record
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {getLinkedLabel(event) || "No linked record"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <p className="text-xs text-slate-500">
                        {event.location || event.meetingUrl || "No location or meeting link"}
                      </p>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                        onClick={() => openEditModal(event)}
                        type="button"
                      >
                        Open event
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
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
