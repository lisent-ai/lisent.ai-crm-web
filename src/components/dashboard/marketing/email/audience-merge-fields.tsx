"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createMailchimpMergeField,
  CRMClientError,
  deleteMailchimpMergeField,
  listMailchimpMergeFields,
  type MailchimpMergeField,
} from "@/lib/crm/client";

type AudienceMergeFieldsProps = {
  companyId: string;
  listId: string;
};

const FIELD_TYPES = [
  "text",
  "number",
  "phone",
  "url",
  "imageurl",
  "date",
  "birthday",
  "address",
  "zip",
  "dropdown",
  "radio",
] as const;

// AudienceMergeFields lets the operator add/edit/delete custom audience
// columns (Mailchimp calls them "merge fields"). Defaults like FNAME +
// LNAME are read-only — only operator-created fields can be deleted.
//
// Create form is collapsed by default. Per-row delete with confirm.
// Update is intentionally NOT exposed here — Mailchimp's PATCH surface
// has subtle gotchas around `tag` immutability and option enums that
// are easier to debug in their own UI; ship in a follow-up if asked.
export function AudienceMergeFields({
  companyId,
  listId,
}: Readonly<AudienceMergeFieldsProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpMergeField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof FIELD_TYPES)[number]>("text");
  const [defaultValue, setDefaultValue] = useState("");
  const [required, setRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMailchimpMergeFields(companyId, listId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.merge_fields ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.merge.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, listId, refreshTick, t]);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  async function handleCreate() {
    setActionError(null);
    if (!tag.trim() || !name.trim()) {
      setActionError(t("marketing.email.merge.errRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await createMailchimpMergeField(companyId, listId, {
        tag: tag.trim().toUpperCase().slice(0, 10),
        name: name.trim(),
        type,
        required,
        default_value: defaultValue.trim() || undefined,
      });
      setTag("");
      setName("");
      setType("text");
      setDefaultValue("");
      setRequired(false);
      setShowCreate(false);
      refresh();
    } catch (err) {
      setActionError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.merge.createFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(field: MailchimpMergeField) {
    if (!window.confirm(t("marketing.email.merge.confirmDelete"))) return;
    try {
      await deleteMailchimpMergeField(companyId, listId, field.merge_id);
      refresh();
    } catch (err) {
      setActionError(
        err instanceof CRMClientError
          ? err.message
          : t("marketing.email.merge.deleteFailed"),
      );
    }
  }

  if (loading) {
    return (
      <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
        {t("marketing.email.merge.loading")}
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("marketing.email.merge.count", { count: items.length })}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {showCreate
            ? t("marketing.email.merge.cancelNew")
            : t("marketing.email.merge.newField")}
        </button>
      </div>

      {(error || actionError) && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error ?? actionError}
        </p>
      )}

      {showCreate && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.merge.fields.tag")}
              </span>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="COMPANY"
                maxLength={10}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text-primary)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.merge.fields.name")}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.merge.fields.type")}
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as (typeof FIELD_TYPES)[number])}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
              >
                {FIELD_TYPES.map((t2) => (
                  <option key={t2} value={t2}>
                    {t2}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.merge.fields.defaultValue")}
              </span>
              <input
                type="text"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="flex items-center gap-2 self-end text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              {t("marketing.email.merge.fields.required")}
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {submitting
                ? t("marketing.email.merge.creating")
                : t("marketing.email.merge.create")}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
          {t("marketing.email.merge.empty")}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-3 py-2 font-medium">{t("marketing.email.merge.col.tag")}</th>
              <th className="px-3 py-2 font-medium">{t("marketing.email.merge.col.name")}</th>
              <th className="px-3 py-2 font-medium">{t("marketing.email.merge.col.type")}</th>
              <th className="px-3 py-2 font-medium">{t("marketing.email.merge.col.required")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.merge_id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                  *|{f.tag}|*
                </td>
                <td className="px-3 py-2 text-[var(--text-primary)]">{f.name}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{f.type}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">
                  {f.required ? "✓" : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
                  >
                    {t("marketing.email.merge.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.merge.hint")}
      </p>
    </>
  );
}
