"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  createMailchimpCampaign,
  listMailchimpAudiences,
  setMailchimpCampaignContent,
  type MailchimpAudience,
  type MailchimpCampaign,
} from "@/lib/crm/client";

type CampaignCreateModalProps = {
  companyId: string;
  onClose: () => void;
  onCreated: (campaign: MailchimpCampaign) => void;
};

// CampaignCreateModal posts a minimal "regular" campaign — Mailchimp's
// default type for one-shot HTML broadcasts. We chain two API calls:
//   1. POST /3.0/campaigns with the recipients + settings envelope
//   2. PUT  /3.0/campaigns/{id}/content with raw HTML the operator typed
//
// On success the draft is sitting in Mailchimp ready to send. The
// CampaignList re-fetches and the row's "Send" button takes it live.
// We deliberately do NOT auto-send on submit — the send action lives on
// the list row so the operator has one last sanity check.
export function CampaignCreateModal({
  companyId,
  onClose,
  onCreated,
}: Readonly<CampaignCreateModalProps>) {
  const t = useTranslations();
  const [audiences, setAudiences] = useState<MailchimpAudience[]>([]);
  const [audienceLoadError, setAudienceLoadError] = useState<string | null>(null);
  const [listId, setListId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [html, setHtml] = useState(
    "<p>Hello {{FNAME|there}},</p>\n<p>Type your message here.</p>",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMailchimpAudiences(companyId, { count: 100 })
      .then((res) => {
        if (cancelled) return;
        const lists = res.lists ?? [];
        setAudiences(lists);
        if (lists.length > 0 && !listId) {
          setListId(lists[0].id);
          if (!fromName) {
            // Mailchimp ships a default `from_name` per audience under
            // contact.company. Use it so the operator usually doesn't
            // have to retype it.
            const def = lists[0].contact?.company?.trim();
            if (def) setFromName(def);
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setAudienceLoadError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.audiences.loadFailed"),
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, t]);

  async function handleSubmit() {
    setError(null);
    if (!listId) {
      setError(t("marketing.email.campaigns.errAudienceRequired"));
      return;
    }
    if (!subject.trim()) {
      setError(t("marketing.email.campaigns.errSubjectRequired"));
      return;
    }
    if (!fromName.trim() || !replyTo.trim()) {
      setError(t("marketing.email.campaigns.errFromRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const draft = (await createMailchimpCampaign(companyId, {
        type: "regular",
        recipients: { list_id: listId },
        settings: {
          subject_line: subject.trim(),
          title: (title || subject).trim(),
          from_name: fromName.trim(),
          reply_to: replyTo.trim(),
          auto_footer: false,
        },
      })) as MailchimpCampaign;

      if (html.trim()) {
        await setMailchimpCampaignContent(companyId, draft.id, {
          html,
        });
      }

      onCreated(draft);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.campaigns.createFailed"),
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
        className="flex w-full max-w-2xl flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("marketing.email.campaigns.createTitle")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("marketing.email.campaigns.createBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            aria-label={t("marketing.email.audiences.members.close")}
          >
            ✕
          </button>
        </header>

        {(error || audienceLoadError) && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error ?? audienceLoadError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.audience")}
            </span>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="" disabled>
                {audiences.length === 0
                  ? t("marketing.email.campaigns.audiencesEmpty")
                  : t("marketing.email.campaigns.fields.audiencePlaceholder")}
              </option>
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.stats?.member_count ?? "?"} members)
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.subject")}
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("marketing.email.campaigns.fields.subjectPlaceholder")}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.internalTitle")}
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("marketing.email.campaigns.fields.internalTitlePlaceholder")}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.fromName")}
            </span>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Lisent"
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.replyTo")}
            </span>
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="noreply@lisent.ai"
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.htmlBody")}
            </span>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={10}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-tertiary)]">
              {t("marketing.email.campaigns.fields.htmlHint")}
            </span>
          </label>
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
              ? t("marketing.email.campaigns.creating")
              : t("marketing.email.campaigns.createSubmit")}
          </button>
        </footer>
      </div>
    </div>
  );
}
