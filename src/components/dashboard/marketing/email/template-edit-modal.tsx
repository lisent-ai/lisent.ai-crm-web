"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  createMailchimpTemplate,
  getMailchimpTemplate,
  updateMailchimpTemplate,
  type MailchimpTemplate,
} from "@/lib/crm/client";

type TemplateEditModalProps = {
  companyId: string;
  // null → create flow; existing template → edit flow
  template: MailchimpTemplate | null;
  onClose: () => void;
  onSaved: () => void;
};

// TemplateEditModal handles both Create and Update for user-owned
// Mailchimp templates. The list endpoint returns templates without the
// HTML body; we lazy-fetch it via GET /templates/{id} when entering edit
// mode so the textarea starts populated with the live content.
export function TemplateEditModal({
  companyId,
  template,
  onClose,
  onSaved,
}: Readonly<TemplateEditModalProps>) {
  const t = useTranslations();
  const [name, setName] = useState(template?.name ?? "");
  const [html, setHtml] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(template !== null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!template) return;
    let cancelled = false;
    getMailchimpTemplate(companyId, template.id)
      .then((res) => {
        if (cancelled) return;
        // Mailchimp returns the HTML body on the detail endpoint under
        // `html` (top-level). Some legacy templates store body under a
        // nested `source.html`; we coalesce both shapes.
        const body =
          (res as { html?: string; source?: { html?: string } }).html ??
          (res as { source?: { html?: string } }).source?.html ??
          "";
        setHtml(body);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.templates.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingHtml(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, template, t]);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError(t("marketing.email.templates.errNameRequired"));
      return;
    }
    if (!html.trim()) {
      setError(t("marketing.email.templates.errHtmlRequired"));
      return;
    }
    setSubmitting(true);
    try {
      if (template) {
        await updateMailchimpTemplate(companyId, template.id, {
          name: name.trim(),
          html,
        });
      } else {
        await createMailchimpTemplate(companyId, {
          name: name.trim(),
          html,
        });
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.templates.saveFailed"),
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
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {template
              ? t("marketing.email.templates.editTitle")
              : t("marketing.email.templates.createTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            aria-label={t("marketing.email.audiences.members.close")}
          >
            ✕
          </button>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.templates.fields.name")}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("marketing.email.templates.fields.namePlaceholder")}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.templates.fields.html")}
          </span>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={14}
            placeholder={
              loadingHtml
                ? t("marketing.email.templates.loadingBody")
                : "<p>Hello {{FNAME|there}},</p>"
            }
            disabled={loadingHtml}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] disabled:opacity-60"
          />
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("marketing.email.templates.fields.htmlHint")}
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
            disabled={submitting || loadingHtml}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {submitting
              ? t("marketing.email.templates.saving")
              : template
                ? t("marketing.email.templates.update")
                : t("marketing.email.templates.create")}
          </button>
        </footer>
      </div>
    </div>
  );
}
