"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
// fields per step, helper text per field, no emojis. Source strings
// live in EN; Tolgee + Groq fan them out to the 14 other languages.
export function AgencyCreateModal({
  companyId,
  initialAgency,
  onClose,
  onSaved,
}: Readonly<AgencyCreateModalProps>) {
  const t = useTranslations();
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
            : t("marketing.agencies.createModal.saveError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Wizard
      modalTitle={
        isEdit
          ? t("marketing.agencies.createModal.editTitle", {
              name: initialAgency?.name ?? "",
            })
          : t("marketing.agencies.createModal.newTitle")
      }
      modalSubtitle={t("marketing.agencies.createModal.newSubtitle")}
      onCancel={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel={
        isEdit
          ? t("marketing.agencies.createModal.saveChanges")
          : t("marketing.agencies.createModal.submit")
      }
      submittingLabel={t("marketing.agencies.createModal.saving")}
      steps={[
        {
          key: "name",
          title: t("marketing.agencies.createWizard.name.title"),
          description: t("marketing.agencies.createWizard.name.description"),
          isValid: () => name.trim().length > 0,
          body: (
            <WizardField
              label={t("marketing.agencies.createWizard.name.fieldLabel")}
              help={t("marketing.agencies.createWizard.name.fieldHelp")}
              example={t("marketing.agencies.createWizard.name.fieldExample")}
              required
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  "marketing.agencies.createWizard.name.fieldExample",
                )}
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "contact",
          title: t("marketing.agencies.createWizard.contact.title"),
          description: t("marketing.agencies.createWizard.contact.description"),
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label={t("marketing.agencies.createWizard.contact.fieldLabel")}
              help={t("marketing.agencies.createWizard.contact.fieldHelp")}
              example={t(
                "marketing.agencies.createWizard.contact.fieldExample",
              )}
            >
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder={t(
                  "marketing.agencies.createWizard.contact.fieldExample",
                )}
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "reach",
          title: t("marketing.agencies.createWizard.reach.title"),
          description: t("marketing.agencies.createWizard.reach.description"),
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label={t("marketing.agencies.createWizard.reach.emailLabel")}
                help={t("marketing.agencies.createWizard.reach.emailHelp")}
                example={t(
                  "marketing.agencies.createWizard.reach.emailExample",
                )}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(
                    "marketing.agencies.createWizard.reach.emailExample",
                  )}
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField
                label={t("marketing.agencies.createWizard.reach.phoneLabel")}
                help={t("marketing.agencies.createWizard.reach.phoneHelp")}
                example={t(
                  "marketing.agencies.createWizard.reach.phoneExample",
                )}
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t(
                    "marketing.agencies.createWizard.reach.phoneExample",
                  )}
                  className={inputClass}
                />
              </WizardField>
            </div>
          ),
        },
        {
          key: "window",
          title: t("marketing.agencies.createWizard.window.title"),
          description: t("marketing.agencies.createWizard.window.description"),
          isValid: () => {
            if (startsAt && endsAt) return endsAt >= startsAt;
            return true;
          },
          alwaysComplete: true,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label={t("marketing.agencies.createWizard.window.startsLabel")}
                help={t("marketing.agencies.createWizard.window.startsHelp")}
              >
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField
                label={t("marketing.agencies.createWizard.window.endsLabel")}
                help={t("marketing.agencies.createWizard.window.endsHelp")}
              >
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
          title: t("marketing.agencies.createWizard.status.title"),
          description: t("marketing.agencies.createWizard.status.description"),
          isValid: () => true,
          body: (
            <WizardField
              label={t("marketing.agencies.createWizard.status.fieldLabel")}
              help={t("marketing.agencies.createWizard.status.fieldHelp")}
            >
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AgencyStatus)}
                className={inputClass}
                autoFocus
              >
                <option value="active">
                  {t("marketing.agencies.filter.statusActive")}
                </option>
                <option value="inactive">
                  {t("marketing.agencies.filter.statusInactive")}
                </option>
                <option value="expired">
                  {t("marketing.agencies.filter.statusExpired")}
                </option>
              </select>
            </WizardField>
          ),
        },
        {
          key: "tags",
          title: t("marketing.agencies.createWizard.tags.title"),
          description: t("marketing.agencies.createWizard.tags.description"),
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label={t("marketing.agencies.createWizard.tags.fieldLabel")}
              help={t("marketing.agencies.createWizard.tags.fieldHelp")}
              example={t("marketing.agencies.createWizard.tags.fieldExample")}
            >
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder={t(
                  "marketing.agencies.createWizard.tags.fieldExample",
                )}
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "notes",
          title: t("marketing.agencies.createWizard.notes.title"),
          description: t("marketing.agencies.createWizard.notes.description"),
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label={t("marketing.agencies.createWizard.notes.fieldLabel")}
              help={t("marketing.agencies.createWizard.notes.fieldHelp")}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder={t(
                  "marketing.agencies.createWizard.notes.fieldPlaceholder",
                )}
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
