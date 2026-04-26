import type { CompanyMember } from "@/lib/auth/company-membership-client";
import type { Customer, Lead } from "@/lib/crm/client";

import { DealModalFrame } from "./deal-modal-frame";
import { dealStages, supportedDealCurrencies, type DealFormState } from "./deal-types";

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
  return (
    <DealModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            {editing ? "Edit deal" : "New deal"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {editing ? "Update opportunity" : "Capture a new opportunity"}
          </h2>
        </div>
        <button
          className="shrink-0 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:px-5 sm:py-3"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <TextField
          label="Deal name"
          onChange={(value) => onFormChange((current) => ({ ...current, name: value }))}
          placeholder="Enterprise renewal"
          value={form.name}
        />
        <SelectField
          label="Pipeline stage"
          onChange={(value) =>
            onFormChange((current) => ({
              ...current,
              stage: value as DealFormState["stage"],
            }))
          }
          options={dealStages.map((stage) => ({
            label: `${stage.label} · ${stage.description}`,
            value: stage.value,
          }))}
          value={form.stage}
        />

        <SelectField
          label="Customer"
          onChange={(value) => onFormChange((current) => ({ ...current, customerId: value }))}
          options={[
            { label: "No linked customer", value: "" },
            ...customers.map((customer) => ({
              label: customer.name || customer.email || customer.id,
              value: customer.id,
            })),
          ]}
          value={form.customerId}
        />
        <SelectField
          label="Source lead"
          onChange={(value) => onFormChange((current) => ({ ...current, sourceLeadId: value }))}
          options={[
            { label: "No source lead", value: "" },
            ...leads.map((lead) => ({
              label: lead.name || lead.email || lead.id,
              value: lead.id,
            })),
          ]}
          value={form.sourceLeadId}
        />

        <NumberField
          label="Amount"
          onChange={(value) => onFormChange((current) => ({ ...current, amount: value }))}
          placeholder="15000"
          value={form.amount}
        />
        <SelectField
          label="Currency"
          onChange={(value) => onFormChange((current) => ({ ...current, currency: value }))}
          options={supportedDealCurrencies.map((currency) => ({
            label: currency,
            value: currency,
          }))}
          value={form.currency}
        />

        <DateField
          label="Expected close date"
          onChange={(value) => onFormChange((current) => ({ ...current, closeDate: value }))}
          value={form.closeDate}
        />
        <DateField
          label="Deal termination"
          onChange={(value) =>
            onFormChange((current) => ({ ...current, terminationDate: value }))
          }
          value={form.terminationDate}
        />

        <SelectField
          label="Assignee"
          onChange={(value) => {
            const member = members.find((item) => item.userId === value);
            onFormChange((current) => ({
              ...current,
              assigneeUserId: value,
              assigneeUserName: member?.displayName ?? "",
            }));
          }}
          options={[
            { label: "Unassigned", value: "" },
            ...members.map((member) => ({
              label: member.displayName || member.email,
              value: member.userId,
            })),
          ]}
          value={form.assigneeUserId}
        />
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
          The assignee is stored directly on the deal record, so ownership is visible
          in the pipeline even if the deal is not yet tied to a customer lifecycle.
        </div>

        {form.stage === "won" ? (
          <TextField
            label="Won reason"
            onChange={(value) => onFormChange((current) => ({ ...current, wonReason: value }))}
            placeholder="Renewal signed after security review"
            value={form.wonReason}
          />
        ) : null}

        {form.stage === "lost" ? (
          <TextField
            label="Loss reason"
            onChange={(value) => onFormChange((current) => ({ ...current, lossReason: value }))}
            placeholder="Budget frozen or competitor selected"
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
          {saving ? "Saving..." : editing ? "Save changes" : "Create deal"}
        </button>
        <button
          className="w-full rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:w-auto"
          onClick={onClose}
          type="button"
        >
          Cancel
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
