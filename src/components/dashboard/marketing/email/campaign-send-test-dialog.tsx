"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  sendMailchimpTestCampaign,
  type MailchimpCampaign,
} from "@/lib/crm/client";

type CampaignSendTestDialogProps = {
  companyId: string;
  campaign: MailchimpCampaign;
  onClose: () => void;
};

// CampaignSendTestDialog mails the current campaign draft to an
// operator-supplied list of test emails. Mailchimp's docs cap test
// recipients per call but we don't enforce a count — the API surfaces
// validation errors which we render verbatim. Send type defaults to
// HTML; operators can flip to plain-text for spam-filter checks.
export function CampaignSendTestDialog({
  companyId,
  campaign,
  onClose,
}: Readonly<CampaignSendTestDialogProps>) {
  const t = useTranslations();
  const [emailsRaw, setEmailsRaw] = useState("");
  const [sendType, setSendType] = useState<"html" | "plaintext">("html");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    const emails = emailsRaw
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (emails.length === 0) {
      setError(t("marketing.email.campaigns.test.emailsRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await sendMailchimpTestCampaign(companyId, campaign.id, emails, sendType);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.campaigns.test.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
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
            {t("marketing.email.campaigns.test.title")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {campaign.settings?.subject_line ?? campaign.id}
          </p>
        </header>

        {sent ? (
          <>
            <p className="rounded-[var(--radius-card)] border border-[var(--signal-green)] bg-[var(--signal-green-soft)] px-3 py-2 text-sm text-[var(--signal-green)]">
              {t("marketing.email.campaigns.test.sent")}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                {t("marketing.email.audiences.members.close")}
              </button>
            </div>
          </>
        ) : (
          <>
            {error && (
              <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
                {error}
              </p>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.test.emailsLabel")}
              </span>
              <textarea
                value={emailsRaw}
                onChange={(e) => setEmailsRaw(e.target.value)}
                rows={3}
                placeholder="alice@example.com, bob@example.com"
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.test.emailsHint")}
              </span>
            </label>
            <fieldset className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.test.format")}
              </span>
              <div className="flex gap-3 text-sm text-[var(--text-primary)]">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="send-type"
                    value="html"
                    checked={sendType === "html"}
                    onChange={() => setSendType("html")}
                  />
                  HTML
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="send-type"
                    value="plaintext"
                    checked={sendType === "plaintext"}
                    onChange={() => setSendType("plaintext")}
                  />
                  {t("marketing.email.campaigns.test.plaintext")}
                </label>
              </div>
            </fieldset>
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
                  ? t("marketing.email.campaigns.test.sending")
                  : t("marketing.email.campaigns.test.send")}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
