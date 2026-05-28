"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  getMailchimpTemplate,
  type MailchimpTemplate,
} from "@/lib/crm/client";

import { TemplatePreviewFrame } from "./template-preview-frame";

type TemplatePreviewModalProps = {
  companyId: string;
  template: MailchimpTemplate;
  onClose: () => void;
};

// TemplatePreviewModal is the read-only "Preview" affordance on the
// TemplateList row. We re-fetch /templates/{id} on open because the
// list endpoint trims the HTML body — same lazy-fetch pattern as the
// edit modal, just rendered without the editor side.
export function TemplatePreviewModal({
  companyId,
  template,
  onClose,
}: Readonly<TemplatePreviewModalProps>) {
  const t = useTranslations();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMailchimpTemplate(companyId, template.id)
      .then((res) => {
        if (cancelled) return;
        const body =
          (res as { html?: string; source?: { html?: string } }).html ??
          (res as { source?: { html?: string } }).source?.html ??
          "";
        setHtml(body);
        setError(null);
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
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, template.id, t]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {template.name}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {template.category ?? "—"} · ID {template.id}
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

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-tertiary)]">
            {t("marketing.email.templates.loadingBody")}
          </p>
        ) : (
          <TemplatePreviewFrame html={html} title={template.name} />
        )}
      </div>
    </div>
  );
}
