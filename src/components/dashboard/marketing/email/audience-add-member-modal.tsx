"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  upsertMailchimpMember,
} from "@/lib/crm/client";

type AudienceAddMemberModalProps = {
  companyId: string;
  listId: string;
  listName: string;
  onClose: () => void;
  onAdded: () => void;
};

// AudienceAddMemberModal upserts a SINGLE subscriber. Uses the PUT-by-MD5
// endpoint, so a repeated submit with the same email patches the existing
// row instead of erroring. `tags` is comma-separated for simplicity —
// the underlying Mailchimp API takes a structured array but operators
// just want to type "vip, beta, sf-bay".
export function AudienceAddMemberModal({
  companyId,
  listId,
  listName,
  onClose,
  onAdded,
}: Readonly<AudienceAddMemberModalProps>) {
  const t = useTranslations();
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
  // Show only Email + First name + Last name by default. Phone / status /
  // tags hide behind "More options" — most operators just need a name+
  // email, so the modal shouldn't show 6 fields up front.
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("marketing.email.audiences.addMember.errEmailRequired"));
      return;
    }
    const merge: Record<string, string> = {};
    if (firstName.trim()) merge.FNAME = firstName.trim();
    if (lastName.trim()) merge.LNAME = lastName.trim();
    if (phone.trim()) merge.PHONE = phone.trim();

    const tags = tagsRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSubmitting(true);
    try {
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
            : t("marketing.email.audiences.addMember.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("marketing.email.audiences.addMember.title")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("marketing.email.audiences.addMember.body", { audience: listName })}
          </p>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.audiences.addMember.fields.email")}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.audiences.addMember.fields.firstName")}
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.audiences.addMember.fields.lastName")}
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="self-start text-xs font-medium text-[var(--accent)] hover:underline sm:col-span-2"
          >
            {showAdvanced
              ? t("marketing.email.audiences.addMember.hideMore")
              : t("marketing.email.audiences.addMember.showMore")}
          </button>

          {showAdvanced && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("marketing.email.audiences.addMember.fields.phone")}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 555 000 00 00"
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("marketing.email.audiences.addMember.fields.status")}
                </span>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "subscribed" | "pending" | "unsubscribed")
                  }
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="subscribed">
                    {t("marketing.email.audiences.addMember.status.subscribed")}
                  </option>
                  <option value="pending">
                    {t("marketing.email.audiences.addMember.status.pending")}
                  </option>
                  <option value="unsubscribed">
                    {t("marketing.email.audiences.addMember.status.unsubscribed")}
                  </option>
                </select>
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("marketing.email.audiences.addMember.fields.tags")}
                </span>
                <input
                  type="text"
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  placeholder="vip, beta, sf-bay"
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {t("marketing.email.audiences.addMember.fields.tagsHint")}
                </span>
              </label>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            {t("integrations.mailchimp.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {submitting
              ? t("marketing.email.audiences.addMember.submitting")
              : t("marketing.email.audiences.addMember.submit")}
          </button>
        </footer>
      </div>
    </div>
  );
}
