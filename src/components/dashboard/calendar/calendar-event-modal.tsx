"use client";

import type {
  CalendarEventStatus,
  CalendarEventType,
  CalendarLinkedEntityType,
  Company,
  Customer,
  Deal,
  Lead,
} from "@/lib/crm/client";
import type { CompanyMember } from "@/lib/auth/company-membership-client";

export type CalendarEventFormState = {
  title: string;
  description: string;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  startAt: string;
  endAt: string;
  allDay: boolean;
  assigneeUserId: string;
  linkedEntityType: CalendarLinkedEntityType;
  linkedEntityId: string;
  customerId: string;
  location: string;
  meetingUrl: string;
  reminderMinutesBefore: string;
};

type CalendarEventModalProps = {
  company: Company;
  customers: Customer[];
  leads: Lead[];
  deals: Deal[];
  members: CompanyMember[];
  form: CalendarEventFormState;
  saving: boolean;
  editing: boolean;
  onClose: () => void;
  onDelete: (() => void) | null;
  onFormChange: (next: CalendarEventFormState) => void;
  onSave: () => void;
};

function buildMinDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMinDateTimeValue() {
  const now = new Date();
  now.setSeconds(0, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const eventTypeOptions: Array<{ value: CalendarEventType; label: string }> = [
  { value: "follow_up", label: "Follow-up" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "demo", label: "Demo" },
  { value: "deadline", label: "Deadline" },
];

const eventStatusOptions: Array<{ value: CalendarEventStatus; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
  { value: "missed", label: "Missed" },
];

const linkedTypeOptions: Array<{ value: CalendarLinkedEntityType; label: string }> = [
  { value: "", label: "No linked record" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "customer", label: "Customer" },
  { value: "company", label: "Company" },
];

export function CalendarEventModal({
  company,
  customers,
  leads,
  deals,
  members,
  form,
  saving,
  editing,
  onClose,
  onDelete,
  onFormChange,
  onSave,
}: Readonly<CalendarEventModalProps>) {
  function updateField<K extends keyof CalendarEventFormState>(
    field: K,
    value: CalendarEventFormState[K],
  ) {
    onFormChange({
      ...form,
      [field]: value,
    });
  }

  const assignableMembers = members
    .filter((member) => member.role !== "viewer")
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  const linkedOptions =
    form.linkedEntityType === "lead"
      ? leads.map((lead) => ({
          value: lead.id,
          label: lead.name || lead.email || lead.id,
        }))
      : form.linkedEntityType === "deal"
        ? deals.map((deal) => ({
            value: deal.id,
            label: deal.name || deal.id,
          }))
        : form.linkedEntityType === "customer"
        ? customers.map((customer) => ({
            value: customer.id,
            label: customer.name || customer.email || customer.id,
          }))
        : [];

  const minimumStartValue = form.allDay ? buildMinDateValue() : buildMinDateTimeValue();
  const minimumEndValue = form.startAt.trim() ? form.startAt : minimumStartValue;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700/80">
              {editing ? "Edit event" : "New event"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {editing ? "Update calendar event" : "Schedule a CRM activity"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Keep the calendar tied to real CRM work: follow-ups, meetings, demos, and
              deadlines linked to company records.
            </p>
          </div>

          <button
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Title
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Discovery call with Nova Health"
              value={form.title}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Event type
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                updateField("eventType", event.target.value as CalendarEventType)
              }
              value={form.eventType}
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
            Description
            <textarea
              className="min-h-28 rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Call to confirm scope, timeline, and next step."
              value={form.description}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Status
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                updateField("status", event.target.value as CalendarEventStatus)
              }
              value={form.status}
            >
              {eventStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Assignee
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("assigneeUserId", event.target.value)}
              value={form.assigneeUserId}
            >
              <option value="">Unassigned</option>
              {assignableMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-[1.1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 lg:col-span-2">
            <input
              checked={form.allDay}
              className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
              onChange={(event) => updateField("allDay", event.target.checked)}
              type="checkbox"
            />
            All-day event
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {form.allDay ? "Start date" : "Start"}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              min={!editing ? minimumStartValue : undefined}
              onChange={(event) => updateField("startAt", event.target.value)}
              type={form.allDay ? "date" : "datetime-local"}
              value={form.startAt}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {form.allDay ? "End date" : "End"}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              min={minimumEndValue}
              onChange={(event) => updateField("endAt", event.target.value)}
              type={form.allDay ? "date" : "datetime-local"}
              value={form.endAt}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Link to
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                const nextType = event.target.value as CalendarLinkedEntityType;
                onFormChange({
                  ...form,
                  linkedEntityType: nextType,
                  linkedEntityId: nextType === "company" ? company.id : "",
                  customerId: nextType === "company" ? "" : form.customerId,
                });
              }}
              value={form.linkedEntityType}
            >
              {linkedTypeOptions.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {form.linkedEntityType === "company" ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Company record
              <input
                className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-950"
                readOnly
                value={company.name}
              />
            </label>
          ) : form.linkedEntityType ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Linked record
              <select
                className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
                onChange={(event) => updateField("linkedEntityId", event.target.value)}
                value={form.linkedEntityId}
              >
                <option value="">Select a record</option>
                {linkedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Customer link
              <select
                className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
                onChange={(event) => updateField("customerId", event.target.value)}
                value={form.customerId}
              >
                <option value="">Optional customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.email || customer.id}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Customer link
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("customerId", event.target.value)}
              value={form.customerId}
            >
              <option value="">No linked customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.email || customer.id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Location
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Berlin office / Zoom / Phone"
              value={form.location}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Meeting URL
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("meetingUrl", event.target.value)}
              placeholder="https://meet.google.com/..."
              value={form.meetingUrl}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Reminder (minutes before)
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              min="0"
              onChange={(event) => updateField("reminderMinutesBefore", event.target.value)}
              placeholder="15"
              step="5"
              type="number"
              value={form.reminderMinutesBefore}
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            {editing && onDelete ? (
              <button
                className="rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50"
                disabled={saving}
                onClick={onDelete}
                type="button"
              >
                Delete event
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#164e63)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:opacity-50"
              disabled={saving}
              onClick={onSave}
              type="button"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Create event"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
