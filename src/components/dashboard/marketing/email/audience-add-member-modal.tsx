"use client";

import { useState } from "react";

import {
  CRMClientError,
  upsertMailchimpMember,
} from "@/lib/crm/client";

import { Wizard } from "./wizard";
import { WizardField } from "./wizard-field";

type AudienceAddMemberModalProps = {
  companyId: string;
  listId: string;
  listName: string;
  onClose: () => void;
  onAdded: () => void;
};

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// AudienceAddMemberModal — atomic wizard for adding a single
// subscriber. PUT-by-MD5 endpoint means re-running with the same
// email patches the existing row instead of erroring out — useful for
// a quick correction without leaving the wizard.
export function AudienceAddMemberModal({
  companyId,
  listId,
  listName,
  onClose,
  onAdded,
}: Readonly<AudienceAddMemberModalProps>) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"subscribed" | "pending" | "unsubscribed">(
    "subscribed",
  );
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const merge: Record<string, string> = {};
      if (firstName.trim()) merge.FNAME = firstName.trim();
      if (lastName.trim()) merge.LNAME = lastName.trim();
      if (phone.trim()) merge.PHONE = phone.trim();
      const tags = tagsRaw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await upsertMailchimpMember(companyId, listId, trimmedEmail, {
        email_address: trimmedEmail,
        status_if_new: status,
        merge_fields: merge,
        tags,
      });
      onAdded();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to add the subscriber.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Wizard
      modalTitle={`Add a subscriber to ${listName}`}
      modalSubtitle="A short setup — one or two fields per step."
      onCancel={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Add subscriber"
      submittingLabel="Adding…"
      steps={[
        {
          key: "email",
          title: "Email address",
          description:
            "The one piece of data Mailchimp absolutely needs. Used as the unique key for this person.",
          isValid: () => email.trim().length > 0 && email.includes("@"),
          body: (
            <WizardField
              label="Email"
              help="If this email is already in the audience, the existing record gets patched instead of erroring."
              example="alice@example.com"
              required
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@example.com"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "name",
          title: "Subscriber's name",
          description:
            "Optional — but useful for personalized merge tags like *|FNAME|*.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label="First name"
                help="Maps to the FNAME merge field."
                example="Alice"
              >
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alice"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField
                label="Last name"
                help="Maps to the LNAME merge field."
                example="Smith"
              >
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className={inputClass}
                />
              </WizardField>
            </div>
          ),
        },
        {
          key: "phone",
          title: "Phone number (optional)",
          description:
            "Useful if you're planning SMS campaigns or transactional flows later.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Phone number"
              help="Maps to the PHONE merge field. Include the country code if you have it."
              example="+90 555 000 00 00"
            >
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 555 000 00 00"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "status",
          title: "Subscription status",
          description:
            "Subscribed = receives campaigns immediately. Pending = double opt-in required.",
          isValid: () => true,
          body: (
            <WizardField
              label="Status"
              help="Pick Pending if you want Mailchimp to send a confirmation email first."
            >
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "subscribed" | "pending" | "unsubscribed")
                }
                className={inputClass}
                autoFocus
              >
                <option value="subscribed">Subscribed</option>
                <option value="pending">Pending (double opt-in)</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </WizardField>
          ),
        },
        {
          key: "tags",
          title: "Tags (optional)",
          description:
            "Tags are how you segment subscribers later. Created automatically if they don't exist.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Tags"
              help="Separate multiple tags with commas or semicolons."
              example="vip, beta, summer-2026"
            >
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="vip, beta, summer-2026"
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
