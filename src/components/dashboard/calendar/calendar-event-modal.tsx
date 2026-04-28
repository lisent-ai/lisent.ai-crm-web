"use client";

import { useTranslations } from "next-intl";

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
  errorMessage?: string | null;
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

const eventTypeValues: CalendarEventType[] = [
  "follow_up",
  "call",
  "meeting",
  "demo",
  "deadline",
];

const eventStatusValues: CalendarEventStatus[] = [
  "scheduled",
  "completed",
  "canceled",
  "missed",
];

const linkedTypeValues: CalendarLinkedEntityType[] = [
  "",
  "lead",
  "deal",
  "customer",
  "company",
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
  errorMessage,
  onClose,
  onDelete,
  onFormChange,
  onSave,
}: Readonly<CalendarEventModalProps>) {
  const t = useTranslations();
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
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.4rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:max-h-[92vh] sm:rounded-[1.8rem]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-6 sm:py-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700/80 sm:text-sm">
              {editing ? t("calendar.modal.editEyebrow") : t("calendar.modal.newEyebrow")}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-3xl">
              {editing ? t("calendar.modal.editTitle") : t("calendar.modal.newTitle")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:mt-3 sm:leading-7">
              {t("calendar.modal.subtitle")}
            </p>
          </div>

          <button
            aria-label={t("common.close")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:px-5 sm:py-3"
            onClick={onClose}
            type="button"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {errorMessage ? (
            <div className="mb-4 rounded-[1.1rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.title")}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder={t("calendar.placeholders.title")}
              value={form.title}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.eventType")}
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                updateField("eventType", event.target.value as CalendarEventType)
              }
              value={form.eventType}
            >
              {eventTypeValues.map((value) => (
                <option key={value} value={value}>
                  {t(`calendar.eventType.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700 lg:col-span-2">
            {t("calendar.fields.description")}
            <textarea
              className="min-h-28 rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("description", event.target.value)}
              placeholder={t("calendar.placeholders.description")}
              value={form.description}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.status")}
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                updateField("status", event.target.value as CalendarEventStatus)
              }
              value={form.status}
            >
              {eventStatusValues.map((value) => (
                <option key={value} value={value}>
                  {t(`calendar.eventStatus.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.assignee")}
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("assigneeUserId", event.target.value)}
              value={form.assigneeUserId}
            >
              <option value="">{t("calendar.unassigned")}</option>
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
            {t("calendar.fields.allDayEvent")}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {form.allDay ? t("calendar.fields.startDate") : t("calendar.fields.start")}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              min={!editing ? minimumStartValue : undefined}
              onChange={(event) => updateField("startAt", event.target.value)}
              type={form.allDay ? "date" : "datetime-local"}
              value={form.startAt}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {form.allDay ? t("calendar.fields.endDate") : t("calendar.fields.end")}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              min={minimumEndValue}
              onChange={(event) => updateField("endAt", event.target.value)}
              type={form.allDay ? "date" : "datetime-local"}
              value={form.endAt}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.linkTo")}
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
              {linkedTypeValues.map((value) => (
                <option key={value || "none"} value={value}>
                  {t(`calendar.linkedType.${value || "none"}`)}
                </option>
              ))}
            </select>
          </label>

          {form.linkedEntityType === "company" ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              {t("calendar.fields.companyRecord")}
              <input
                className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-950"
                readOnly
                value={company.name}
              />
            </label>
          ) : form.linkedEntityType ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              {t("calendar.fields.linkedRecord")}
              <select
                className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
                onChange={(event) => updateField("linkedEntityId", event.target.value)}
                value={form.linkedEntityId}
              >
                <option value="">{t("calendar.placeholders.selectRecord")}</option>
                {linkedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              {t("calendar.fields.customerLink")}
              <select
                className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
                onChange={(event) => updateField("customerId", event.target.value)}
                value={form.customerId}
              >
                <option value="">{t("calendar.placeholders.optionalCustomer")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.email || customer.id}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.customerLink")}
            <select
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("customerId", event.target.value)}
              value={form.customerId}
            >
              <option value="">{t("calendar.placeholders.noLinkedCustomer")}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name || customer.email || customer.id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.location")}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("location", event.target.value)}
              placeholder={t("calendar.placeholders.location")}
              value={form.location}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.meetingUrl")}
            <input
              className="rounded-[1.1rem] border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateField("meetingUrl", event.target.value)}
              placeholder="https://meet.google.com/..."
              value={form.meetingUrl}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {t("calendar.fields.reminder")}
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
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex w-full sm:w-auto">
            {editing && onDelete ? (
              <button
                className="w-full rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50 sm:w-auto"
                disabled={saving}
                onClick={onDelete}
                type="button"
              >
                {t("calendar.actions.deleteEvent")}
              </button>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:w-auto"
              onClick={onClose}
              type="button"
            >
              {t("common.cancel")}
            </button>
            <button
              className="w-full rounded-full bg-[linear-gradient(90deg,_#0f172a,_#164e63)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
              disabled={saving}
              onClick={onSave}
              type="button"
            >
              {saving ? t("common.saving") : editing ? t("calendar.actions.saveChanges") : t("calendar.actions.createEvent")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
