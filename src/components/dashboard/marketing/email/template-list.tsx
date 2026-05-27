"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  deleteMailchimpTemplate,
  listMailchimpTemplates,
  type MailchimpTemplate,
} from "@/lib/crm/client";

import { TemplateEditModal } from "./template-edit-modal";
import { TemplatePreviewModal } from "./template-preview-modal";

type TemplateListProps = {
  companyId: string;
};

// TemplateList renders the user's Mailchimp templates with separate
// row groups for the "user" templates (operator-created) and the
// "gallery" / "base" templates (Mailchimp-shipped). Only user templates
// expose edit + delete buttons — Mailchimp returns 400 on attempts to
// mutate gallery / base ones.
//
// Phase 1 design choice: raw HTML editing only. Mailchimp's drag-drop
// designer lives in their own UI; an operator who wants a designer-
// authored template uses Mailchimp directly and we surface the result
// here as "user template" for re-use in the Campaigns tab.
export function TemplateList({ companyId }: Readonly<TemplateListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MailchimpTemplate | "new" | null>(null);
  const [previewing, setPreviewing] = useState<MailchimpTemplate | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Default to "user" type — the operator-created templates are what
    // we'll let them edit. Gallery / base browsing can come later.
    listMailchimpTemplates(companyId, { count: 100, type: "user" })
      .then((res) => {
        if (cancelled) return;
        setItems(res.templates ?? []);
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
  }, [companyId, refreshTick, t]);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  const handleDelete = useCallback(
    async (template: MailchimpTemplate) => {
      if (!window.confirm(t("marketing.email.templates.confirmDelete"))) return;
      try {
        await deleteMailchimpTemplate(companyId, template.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.templates.deleteFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  if (loading) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("marketing.email.templates.loading")}
      </article>
    );
  }

  return (
    <>
      <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("marketing.email.templates.title")} · {items.length}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            >
              {t("marketing.email.templates.refresh")}
            </button>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              {t("marketing.email.templates.newTemplate")}
            </button>
          </div>
        </header>

        {(error || actionError) && (
          <p className="border-b border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-6 py-2 text-sm text-[var(--signal-red)]">
            {error ?? actionError}
          </p>
        )}

        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">
              {t("marketing.email.templates.emptyTitle")}
            </p>
            <p className="mt-1">{t("marketing.email.templates.emptyBody")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.templates.col.name")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.templates.col.category")}
                </th>
                <th className="px-6 py-2 font-medium">
                  {t("marketing.email.templates.col.created")}
                </th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]"
                >
                  <td className="px-6 py-3 text-[var(--text-primary)]">
                    <div className="font-medium">{tpl.name}</div>
                    <div className="font-mono text-xs text-[var(--text-tertiary)]">
                      ID: {tpl.id}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[var(--text-secondary)]">
                    {tpl.category ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-[var(--text-secondary)]">
                    {tpl.date_created
                      ? new Date(tpl.date_created).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewing(tpl)}
                        className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                      >
                        {t("marketing.email.templates.actions.preview")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(tpl)}
                        className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                      >
                        {t("marketing.email.templates.actions.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tpl)}
                        className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
                      >
                        {t("marketing.email.templates.actions.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      {editing && (
        <TemplateEditModal
          companyId={companyId}
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {previewing && (
        <TemplatePreviewModal
          companyId={companyId}
          template={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  );
}
