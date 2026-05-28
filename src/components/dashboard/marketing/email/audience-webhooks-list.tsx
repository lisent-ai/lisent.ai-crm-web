"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  createMailchimpAudienceWebhook,
  CRMClientError,
  deleteMailchimpAudienceWebhook,
  listMailchimpAudienceWebhooks,
  type MailchimpWebhook,
} from "@/lib/crm/client";

type AudienceWebhooksListProps = {
  companyId: string;
  listId: string;
};

// AudienceWebhooksList renders the per-audience webhook subscriptions
// Mailchimp will POST events to (subscribe / unsubscribe / profile /
// cleaned / upemail / campaign). Each operator can register URLs
// pointing to their own n8n flows or to /inbound/mailchimp/:token
// (when Phase 2 bidirectional sync lights up).
export function AudienceWebhooksList({
  companyId,
  listId,
}: Readonly<AudienceWebhooksListProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listMailchimpAudienceWebhooks(companyId, listId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.webhooks ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.webhooks.loadFailed"),
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
    async (wh: MailchimpWebhook) => {
      if (!window.confirm(t("marketing.email.webhooks.confirmDelete"))) return;
      try {
        await deleteMailchimpAudienceWebhook(companyId, listId, wh.id);
        refresh();
      } catch (err) {
        setActionError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.webhooks.deleteFailed"),
        );
      }
    },
    [companyId, listId, refresh, t],
  );

  if (loading) {
    return (
      <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
        {t("marketing.email.webhooks.loading")}
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("marketing.email.webhooks.count", { count: items.length })}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {t("marketing.email.webhooks.create")}
        </button>
      </div>

      {(error || actionError) && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error ?? actionError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
          {t("marketing.email.webhooks.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((wh) => (
            <li
              key={wh.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex-1">
                <p className="break-all font-mono text-xs text-[var(--text-primary)]">
                  {wh.url}
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {Object.entries(wh.events ?? {})
                    .filter(([, on]) => on)
                    .map(([k]) => k)
                    .join(", ") || t("marketing.email.webhooks.noEvents")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(wh)}
                className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
              >
                {t("marketing.email.webhooks.delete")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateWebhookModal
          companyId={companyId}
          listId={listId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.webhooks.hint")}
      </p>
    </>
  );
}

const EVENT_KEYS = [
  "subscribe",
  "unsubscribe",
  "profile",
  "cleaned",
  "upemail",
  "campaign",
] as const;

const SOURCE_KEYS = ["user", "admin", "api"] as const;

type CreateWebhookModalProps = {
  companyId: string;
  listId: string;
  onClose: () => void;
  onCreated: () => void;
};

function CreateWebhookModal({
  companyId,
  listId,
  onClose,
  onCreated,
}: Readonly<CreateWebhookModalProps>) {
  const t = useTranslations();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Record<string, boolean>>({
    subscribe: true,
    unsubscribe: true,
    profile: false,
    cleaned: true,
    upemail: false,
    campaign: false,
  });
  const [sources, setSources] = useState<Record<string, boolean>>({
    user: true,
    admin: true,
    api: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!url.trim().startsWith("https://")) {
      setError(t("marketing.email.webhooks.errUrlRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await createMailchimpAudienceWebhook(companyId, listId, {
        url: url.trim(),
        events: events as Parameters<typeof createMailchimpAudienceWebhook>[2]["events"],
        sources: sources as Parameters<typeof createMailchimpAudienceWebhook>[2]["sources"],
      });
      onCreated();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.webhooks.createFailed"),
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
            {t("marketing.email.webhooks.createTitle")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("marketing.email.webhooks.createBody")}
          </p>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.webhooks.fields.url")}
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://n8n.lisent.ai/webhook/..."
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.webhooks.fields.events")}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={events[key]}
                  onChange={(e) =>
                    setEvents((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
                {key}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.webhooks.fields.sources")}
          </legend>
          <div className="flex gap-4">
            {SOURCE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={sources[key]}
                  onChange={(e) =>
                    setSources((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
                {key}
              </label>
            ))}
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
              ? t("marketing.email.webhooks.creating")
              : t("marketing.email.webhooks.create")}
          </button>
        </footer>
      </div>
    </div>
  );
}
