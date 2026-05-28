"use client";

import { useState } from "react";

import {
  CRMClientError,
  createAgency,
  updateAgency,
  type Agency,
  type AgencyStatus,
} from "@/lib/crm/client";

import { Wizard } from "../email/wizard";
import { WizardField } from "../email/wizard-field";

type AgencyCreateModalProps = {
  companyId: string;
  initialAgency?: Agency;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// AgencyCreateModal — wizard for adding (or editing) one agency.
// Same atomic-step pattern as the audience add-member wizard: 1-2
// fields per step, helper text per field, no emojis, English only
// (the Tolgee + DeepL pipeline handles the other 14 languages at
// build time, so the UI strings stay in one file).
export function AgencyCreateModal({
  companyId,
  initialAgency,
  onClose,
  onSaved,
}: Readonly<AgencyCreateModalProps>) {
  const isEdit = Boolean(initialAgency);
  const [name, setName] = useState(initialAgency?.name ?? "");
  const [contactPerson, setContactPerson] = useState(
    initialAgency?.contact_person ?? "",
  );
  const [phone, setPhone] = useState(initialAgency?.phone ?? "");
  const [email, setEmail] = useState(initialAgency?.email ?? "");
  const [startsAt, setStartsAt] = useState(
    initialAgency?.starts_at?.slice(0, 10) ?? "",
  );
  const [endsAt, setEndsAt] = useState(
    initialAgency?.ends_at?.slice(0, 10) ?? "",
  );
  const [status, setStatus] = useState<AgencyStatus>(
    initialAgency?.status ?? "active",
  );
  const [tagsRaw, setTagsRaw] = useState(
    (initialAgency?.tags ?? []).join(", "),
  );
  const [notes, setNotes] = useState(initialAgency?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const tags = tagsRaw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const payload = {
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        status,
        tags,
      };
      if (initialAgency) {
        await updateAgency(companyId, initialAgency.id, payload);
      } else {
        await createAgency(companyId, payload);
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save the agency.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Wizard
      modalTitle={isEdit ? `Edit ${initialAgency?.name}` : "Add a new agency"}
      modalSubtitle="Step through the fields — one or two per screen."
      onCancel={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel={isEdit ? "Save changes" : "Create agency"}
      submittingLabel="Saving…"
      steps={[
        {
          key: "name",
          title: "Agency name",
          description: "The display name your team will recognise.",
          isValid: () => name.trim().length > 0,
          body: (
            <WizardField
              label="Name"
              help="Shown on the directory list and in any campaign mail merge."
              example="Acme Travel Ltd."
              required
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Travel Ltd."
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "contact",
          title: "Primary contact",
          description: "The person you usually talk to at the agency.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Contact name"
              help="Optional — fills LNAME when this agency is pushed to a Mailchimp audience."
              example="Jane Doe"
            >
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Jane Doe"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "reach",
          title: "How to reach them",
          description:
            "Email is required if you want to push this row to Mailchimp later.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label="Email"
                help="Used as the Mailchimp unique key when you push."
                example="jane@acme.example"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@acme.example"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField
                label="Phone"
                help="Free-form — include country code if you have it."
                example="+90 555 000 00 00"
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 555 000 00 00"
                  className={inputClass}
                />
              </WizardField>
            </div>
          ),
        },
        {
          key: "window",
          title: "Contract window",
          description:
            "Both ends are optional — leave a side empty for perpetual or open-ended.",
          isValid: () => {
            if (startsAt && endsAt) return endsAt >= startsAt;
            return true;
          },
          alwaysComplete: true,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label="Starts on"
                help="When the relationship begins."
              >
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField label="Ends on" help="When the relationship ends.">
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={inputClass}
                />
              </WizardField>
            </div>
          ),
        },
        {
          key: "status",
          title: "Status",
          description:
            "Active = currently engaged. Inactive = paused. Expired = past contract end.",
          isValid: () => true,
          body: (
            <WizardField
              label="Status"
              help="You can change this any time — used for filtering the directory."
            >
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AgencyStatus)}
                className={inputClass}
                autoFocus
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </WizardField>
          ),
        },
        {
          key: "tags",
          title: "Tags",
          description:
            "Tags carry through to Mailchimp if you push this agency later.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Tags"
              help="Separate with commas or semicolons. Created on first push."
              example="vip, summer-2026, eu"
            >
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="vip, summer-2026, eu"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "notes",
          title: "Notes",
          description: "Anything else worth remembering about this agency.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Notes"
              help="Free text — not pushed to Mailchimp, only visible inside the CRM."
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Renewal in March. Prefers WhatsApp for quick updates."
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
      ]}
    />
  );
}
