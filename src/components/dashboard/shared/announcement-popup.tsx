"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  dismissAnnouncement,
  getActiveAnnouncements,
  type ActiveAnnouncement,
} from "@/lib/crm/client";

// Shows undismissed published announcements as a modal, one at a time, in
// the user's language. Dismissing records it server-side so it never shows
// again. Fetched on mount; failures are silent (announcements are
// non-critical and must never block the app).
export function AnnouncementPopup() {
  const t = useTranslations();
  const locale = useLocale();
  const [queue, setQueue] = useState<ActiveAnnouncement[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveAnnouncements(locale)
      .then((rows) => {
        if (!cancelled) setQueue(rows);
      })
      .catch(() => {
        /* non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const current = queue[0];
  if (!current) return null;

  async function dismiss() {
    setBusy(true);
    try {
      await dismissAnnouncement(current.id);
    } catch {
      /* still advance locally so the user isn't stuck */
    }
    setBusy(false);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-float)]">
        <div className="h-1.5 w-full bg-[linear-gradient(90deg,_#7c3aed,_#a855f7)]" />
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {current.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">
            {current.body}
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void dismiss()}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {t("announcement.dismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
