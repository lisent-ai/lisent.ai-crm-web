"use client";

import { useTranslations } from "next-intl";

import type { CompanyMember } from "@/lib/auth/company-membership-client";
import type { Customer, Lead } from "@/lib/crm/client";

import { DealModalFrame } from "./deal-modal-frame";
import { dealStageOptions, supportedDealCurrencies, type DealFormState } from "./deal-types";

type DealFormModalProps = {
  form: DealFormState;
  customers: Customer[];
  leads: Lead[];
  members: CompanyMember[];
  saving: boolean;
  editing: boolean;
  onClose: () => void;
  onFormChange: (updater: (current: DealFormState) => DealFormState) => void;
  onSave: () => void;
};

export function DealFormModal({
  form,
  customers,
  leads,
  members,
  saving,
  editing,
  onClose,
  onFormChange,
  onSave,
}: Readonly<DealFormModalProps>) {
  const t = useTranslations();
  return (
    <DealModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            {editing ? t("deals.form.editEyebrow") : t("deals.form.newEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {editing ? t("deals.form.editTitle") : t("deals.form.newTitle")}
          </h2>
        </div>
        <button
          className="shrink-0 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:px-5 sm:py-3"
          onClick={onClose}
          type="button"
        >
          {t("common.close")}
        </button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <TextField
          label={t("deals.form.fields.dealName")}
          onChange={(value) => onFormChange((current) => ({ ...current, name: value }))}
          placeholder={t("deals.form.placeholders.dealName")}
          value={form.name}
        />
        <SelectField
          label={t("deals.form.fields.pipelineStage")}
          onChange={(value) =>
            onFormChange((current) => ({
              ...current,
              stage: value as DealFormState["stage"],
            }))
          }
          options={dealStageOptions.map((stage) => ({
            label: `${t(stage.labelKey as never)} · ${t(stage.descriptionKey as never)}`,
            value: stage.value,
          }))}
          value={form.stage}
        />

        <SelectField
          label={t("deals.form.fields.customer")}
          onChange={(value) => onFormChange((current) => ({ ...current, customerId: value }))}
          options={[
            { label: t("deals.form.options.noLinkedCustomer"), value: "" },
            ...customers.map((customer) => ({
              label: customer.name || customer.email || customer.id,
              value: customer.id,
            })),
          ]}
          value={form.customerId}
        />
        <SelectField
          label={t("deals.form.fields.sourceLead")}
          onChange={(value) => onFormChange((current) => ({ ...current, sourceLeadId: value }))}
          options={[
            { label: t("deals.form.options.noSourceLead"), value: "" },
            ...leads.map((lead) => ({
              label: lead.name || lead.email || lead.id,
              value: lead.id,
            })),
          ]}
          value={form.sourceLeadId}
        />

        <NumberField
          label={t("deals.form.fields.amount")}
          onChange={(value) => onFormChange((current) => ({ ...current, amount: value }))}
          placeholder={t("deals.form.placeholders.amount")}
          value={form.amount}
        />
        <SelectField
          label={t("deals.form.fields.currency")}
          onChange={(value) => onFormChange((current) => ({ ...current, currency: value }))}
          options={supportedDealCurrencies.map((currency) => ({
            label: currency,
            value: currency,
          }))}
          value={form.currency}
        />

        <DateField
          label={t("deals.form.fields.expectedCloseDate")}
          onChange={(value) => onFormChange((current) => ({ ...current, closeDate: value }))}
          value={form.closeDate}
        />
        <DateField
          label={t("deals.form.fields.terminationDate")}
          onChange={(value) =>
            onFormChange((current) => ({ ...current, terminationDate: value }))
          }
          value={form.terminationDate}
        />

        <SelectField
          label={t("deals.form.fields.assignee")}
          onChange={(value) => {
            const member = members.find((item) => item.userId === value);
            onFormChange((current) => ({
              ...current,
              assigneeUserId: value,
              assigneeUserName: member?.displayName ?? "",
            }));
          }}
          options={[
            { label: t("deals.unassigned"), value: "" },
            ...members.map((member) => ({
              label: member.displayName || member.email,
              value: member.userId,
            })),
          ]}
          value={form.assigneeUserId}
        />
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
          {t("deals.form.assigneeHint")}
        </div>

        {form.stage === "won" ? (
          <TextField
            label={t("deals.form.fields.wonReason")}
            onChange={(value) => onFormChange((current) => ({ ...current, wonReason: value }))}
            placeholder={t("deals.form.placeholders.wonReason")}
            value={form.wonReason}
          />
        ) : null}

        {form.stage === "lost" ? (
          <TextField
            label={t("deals.form.fields.lossReason")}
            onChange={(value) => onFormChange((current) => ({ ...current, lossReason: value }))}
            placeholder={t("deals.form.placeholders.lossReason")}
            value={form.lossReason}
          />
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          className="w-full rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          {saving
            ? t("common.saving")
            : editing
              ? t("deals.form.saveChanges")
              : t("deals.form.createDeal")}
        </button>
        <button
          className="w-full rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:w-auto"
          onClick={onClose}
          type="button"
        >
          {t("common.cancel")}
        </button>
      </div>
    </DealModalFrame>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="number"
        value={value}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <select
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
