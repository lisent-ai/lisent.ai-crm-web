"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  createMailchimpSegment,
  deleteMailchimpSegment,
  listMailchimpSegments,
  type MailchimpSegment,
} from "@/lib/crm/client";

type AudienceSegmentListProps = {
  companyId: string;
  listId: string;
};

// AudienceSegmentList renders Mailchimp segments for one audience. Phase
// 1 supports list + delete + create-static (a "static" segment is a
// hand-picked list of member emails — easier to wrap than the "saved"
// segments which need Mailchimp's full conditions DSL).
//
// Conditions/Saved segments still surface as read-only rows; operators
// who need to author conditional segments use Mailchimp's UI for that
// step and the result appears here on refresh.
export function AudienceSegmentList({
  companyId,
  listId,
}: Readonly<AudienceSegmentListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listMailchimpSegments(companyId, listId, { count: 100 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.segments ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.segments.loadFailed"),
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

  const handleDelete = useCallback(
    async (segment: MailchimpSegment) => {
      if (!window.confirm(t("marketing.email.segments.confirmDelete"))) return;
      try {
        await deleteMailchimpSegment(companyId, listId, segment.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.segments.deleteFailed"),
        );
      }
    },
    [companyId, listId, refresh, t],
  );

  if (loading) {
    return (
      <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
        {t("marketing.email.segments.loading")}
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("marketing.email.segments.count", { count: items.length })}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {t("marketing.email.segments.newStatic")}
        </button>
      </div>

      {(error || actionError) && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error ?? actionError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
          {t("marketing.email.segments.empty")}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.segments.col.name")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.segments.col.type")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.segments.col.members")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("marketing.email.segments.col.updated")}
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((seg) => (
              <tr key={seg.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2 text-[var(--text-primary)]">{seg.name}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">
                  <SegmentTypeBadge type={seg.type} />
                </td>
                <td className="px-3 py-2 text-[var(--text-primary)]">
                  {seg.member_count?.toLocaleString() ?? "—"}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">
                  {seg.updated_at
                    ? new Date(seg.updated_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(seg)}
                    className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
                  >
                    {t("marketing.email.segments.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <CreateStaticSegmentModal
          companyId={companyId}
          listId={listId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </>
  );
}

function SegmentTypeBadge({ type }: Readonly<{ type: string }>) {
  const color =
    type === "saved"
      ? "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
      : type === "static"
        ? "bg-[var(--signal-green-soft)] text-[var(--signal-green)]"
        : "bg-[var(--signal-amber-soft)] text-[var(--signal-amber)]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {type}
    </span>
  );
}

type CreateStaticSegmentModalProps = {
  companyId: string;
  listId: string;
  onClose: () => void;
  onCreated: () => void;
};

// CreateStaticSegmentModal wraps the simplest segment creation path —
// a "static" segment listing operator-supplied emails. Mailchimp's
// `static_segment` field on POST /segments takes an array of email
// addresses; matched members are bound to the new segment.
function CreateStaticSegmentModal({
  companyId,
  listId,
  onClose,
  onCreated,
}: Readonly<CreateStaticSegmentModalProps>) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [emailsRaw, setEmailsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError(t("marketing.email.segments.errNameRequired"));
      return;
    }
    const emails = emailsRaw
      .split(/[\s,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setSubmitting(true);
    try {
      await createMailchimpSegment(companyId, listId, {
        name: name.trim(),
        static_segment: emails,
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.segments.createFailed"),
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
            {t("marketing.email.segments.createTitle")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("marketing.email.segments.createBody")}
          </p>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.segments.fields.name")}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VIP customers"
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.segments.fields.emails")}
          </span>
          <textarea
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            rows={5}
            placeholder="alice@example.com\nbob@example.com"
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("marketing.email.segments.fields.emailsHint")}
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
              ? t("marketing.email.segments.creating")
              : t("marketing.email.segments.create")}
          </button>
        </footer>
      </div>
    </div>
  );
}
