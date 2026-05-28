"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  scheduleMailchimpCampaign,
  type MailchimpCampaign,
} from "@/lib/crm/client";

type CampaignScheduleDialogProps = {
  companyId: string;
  campaign: MailchimpCampaign;
  onClose: () => void;
  onScheduled: () => void;
};

// CampaignScheduleDialog wraps Mailchimp's POST /campaigns/{id}/actions/
// schedule. The picker is a native <input type="datetime-local"> in the
// operator's local timezone; we convert to ISO before posting because
// Mailchimp expects UTC-ish ISO strings.
//
// Note: Mailchimp rounds schedule_time DOWN to the nearest 15 minutes
// (00, 15, 30, 45). Free plans may also have additional restrictions
// (e.g. minimum lead time, no schedule between certain hours) that
// surface as a 400 from Mailchimp — the detail message flows back to
// the operator unchanged.
export function CampaignScheduleDialog({
  companyId,
  campaign,
  onClose,
  onScheduled,
}: Readonly<CampaignScheduleDialogProps>) {
  const t = useTranslations();
  // Default to "now + 1 hour, rounded down to nearest 15 minutes" so the
  // operator just has to confirm or tweak. Mailchimp enforces the 15-
  // minute grid server-side; pre-rounding here keeps the picker honest.
  const [scheduleAt, setScheduleAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
    // datetime-local needs "YYYY-MM-DDTHH:mm" in local time.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [timewarp, setTimewarp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!scheduleAt) {
      setError(t("marketing.email.campaigns.schedule.errTimeRequired"));
      return;
    }
    // datetime-local has no timezone suffix; new Date() interprets it
    // as local, then toISOString() converts to UTC ISO 8601 which
    // Mailchimp accepts.
    const iso = new Date(scheduleAt).toISOString();
    setSubmitting(true);
    try {
      await scheduleMailchimpCampaign(companyId, campaign.id, {
        schedule_time: iso,
        timewarp,
      });
      onScheduled();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.campaigns.schedule.failed"),
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
            {t("marketing.email.campaigns.schedule.title")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {campaign.settings?.subject_line ?? campaign.id}
          </p>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.campaigns.schedule.sendAt")}
          </span>
          <input
            type="datetime-local"
            step="900"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("marketing.email.campaigns.schedule.hint")}
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            checked={timewarp}
            onChange={(e) => setTimewarp(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium">
              {t("marketing.email.campaigns.schedule.timewarp")}
            </span>
            <span className="block text-xs text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.schedule.timewarpHint")}
            </span>
          </span>
        </label>

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
              ? t("marketing.email.campaigns.schedule.scheduling")
              : t("marketing.email.campaigns.schedule.confirm")}
          </button>
        </footer>
      </div>
    </div>
  );
}
