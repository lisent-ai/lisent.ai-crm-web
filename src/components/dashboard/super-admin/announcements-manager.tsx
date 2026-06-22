"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  type Announcement,
} from "@/lib/crm/client";
import { locales } from "@/lib/i18n/config";

const inputClass =
  "w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// Super-admin announcements manager: compose → save draft → publish
// (translates to every locale via Groq) → it pops up for all users until
// dismissed. Edit returns an item to draft so it can be re-published.
export function AnnouncementsManager() {
  const t = useTranslations();
  const uiLocale = useLocale();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    source_locale: string;
    title: string;
    body: string;
  }>({
    source_locale: uiLocale,
    title: "",
    body: "",
  });
  const [busy, setBusy] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const langName = useCallback(
    (code: string) => {
      try {
        return (
          new Intl.DisplayNames([uiLocale], { type: "language" }).of(code) ??
          code
        );
      } catch {
        return code;
      }
    },
    [uiLocale],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAnnouncements()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setError(t("superAdmin.announcements.saveError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, t]);

  function openNew() {
    setEditingId(null);
    setForm({ source_locale: uiLocale, title: "", body: "" });
    setError(null);
    setComposing(true);
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({ source_locale: a.source_locale, title: a.title, body: a.body });
    setError(null);
    setComposing(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, form);
      } else {
        await createAnnouncement(form);
      }
      setComposing(false);
      refresh();
    } catch {
      setError(t("superAdmin.announcements.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function publish(id: string) {
    if (!window.confirm(t("superAdmin.announcements.publishConfirm"))) return;
    setPublishingId(id);
    setError(null);
    try {
      await publishAnnouncement(id);
      refresh();
    } catch (e) {
      // Strict translation: the backend refuses to publish until every locale
      // is translated, returning a specific reason — surface it verbatim.
      setError(
        e instanceof CRMClientError && e.message
          ? e.message
          : t("superAdmin.announcements.publishError"),
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("superAdmin.announcements.deleteConfirm"))) return;
    try {
      await deleteAnnouncement(id);
      refresh();
    } catch {
      setError(t("superAdmin.announcements.saveError"));
    }
  }

  return (
    <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("superAdmin.announcements.heading")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
            {t("superAdmin.announcements.description")}
          </p>
        </div>
        {!composing && (
          <button
            type="button"
            onClick={openNew}
            className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            {t("superAdmin.announcements.new")}
          </button>
        )}
      </header>

      {error && (
        <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error}
        </p>
      )}

      {composing && (
        <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              {t("superAdmin.announcements.sourceLocale")}
            </span>
            <select
              value={form.source_locale}
              onChange={(e) =>
                setForm((f) => ({ ...f, source_locale: e.target.value }))
              }
              className={inputClass}
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {langName(l)} ({l})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              {t("superAdmin.announcements.titleLabel")}
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t("superAdmin.announcements.titlePlaceholder")}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              {t("superAdmin.announcements.bodyLabel")}
            </span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder={t("superAdmin.announcements.bodyPlaceholder")}
              rows={5}
              className={inputClass}
            />
          </label>
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("superAdmin.announcements.republishNote")}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="rounded-full border border-[var(--border-subtle)] px-4 py-1.5 text-sm text-[var(--text-secondary)]"
            >
              {t("superAdmin.announcements.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || !form.title.trim() || !form.body.trim()}
              onClick={() => void save()}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {busy
                ? t("superAdmin.announcements.saving")
                : t("superAdmin.announcements.save")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-2">
        {loading && (
          <p className="text-sm text-[var(--text-tertiary)]">…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-tertiary)]">
            {t("superAdmin.announcements.empty")}
          </p>
        )}
        {items.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "published"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {a.status === "published"
                    ? t("superAdmin.announcements.statusPublished")
                    : t("superAdmin.announcements.statusDraft")}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {langName(a.source_locale)}
                </span>
              </div>
              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {a.title}
              </p>
              <p className="line-clamp-2 max-w-xl whitespace-pre-line text-sm text-[var(--text-secondary)]">
                {a.body}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => openEdit(a)}
                className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              >
                {t("superAdmin.announcements.edit")}
              </button>
              <button
                type="button"
                disabled={publishingId !== null}
                onClick={() => void publish(a.id)}
                className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                {publishingId === a.id
                  ? t("superAdmin.announcements.publishing")
                  : t("superAdmin.announcements.publish")}
              </button>
              <button
                type="button"
                onClick={() => void remove(a.id)}
                className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
              >
                {t("superAdmin.announcements.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
