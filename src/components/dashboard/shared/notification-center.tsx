"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  Clock3,
  RefreshCw,
  Target,
} from "lucide-react";

import type { AccountProfile } from "@/lib/auth/account-profile";
import {
  listDashboardNotifications,
  readNotificationState,
  writeNotificationState,
  type DashboardNotification,
  type DashboardNotificationKind,
} from "@/lib/notifications/client";

type NotificationCenterProps = {
  account: AccountProfile | null;
  companyId: string;
  companyName: string;
  demoMode: boolean;
};

export function NotificationCenter({
  account,
  companyId,
  companyName,
  demoMode,
}: Readonly<NotificationCenterProps>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [readState, setReadState] = useState<Record<string, true>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const userId = account?.userId?.trim() ?? "";

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setReadState(readNotificationState(userId, companyId));
  }, [companyId, userId]);

  useEffect(() => {
    if (demoMode || !userId || !companyId) {
      setItems([]);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const nextItems = await listDashboardNotifications({
          companyId,
          companyName,
          userId,
        });
        if (!cancelled) {
          setItems(nextItems);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Failed to load notifications.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    function handleFocus() {
      void loadNotifications();
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [companyId, companyName, demoMode, userId]);

  const unreadCount = useMemo(
    () => items.filter((item) => !readState[item.id]).length,
    [items, readState],
  );

  function updateReadState(updater: (current: Record<string, true>) => Record<string, true>) {
    setReadState((current) => {
      const next = updater(current);
      writeNotificationState(userId, companyId, next);
      return next;
    });
  }

  function handleMarkAsRead(notificationId: string) {
    updateReadState((current) => ({
      ...current,
      [notificationId]: true,
    }));
  }

  function handleMarkAllAsRead() {
    updateReadState((current) => {
      const next = { ...current };
      for (const item of items) {
        next[item.id] = true;
      }
      return next;
    });
  }

  const buttonDisabled = demoMode || !userId;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={buttonDisabled}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--signal-red)] px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[var(--shadow-float)]"
          role="menu"
        >
          <div className="flex items-start justify-between gap-3 px-2 pb-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {companyName ? `Current workspace: ${companyName}` : "Choose a workspace"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                onClick={() => {
                  if (demoMode || !userId || !companyId) return;
                  setLoading(true);
                  void listDashboardNotifications({
                    companyId,
                    companyName,
                    userId,
                  })
                    .then((nextItems) => {
                      setItems(nextItems);
                      setErrorMessage(null);
                    })
                    .catch(() => {
                      setErrorMessage("Failed to load notifications.");
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }}
                title="Refresh notifications"
                type="button"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
              </button>
              {items.length > 0 ? (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  onClick={handleMarkAllAsRead}
                  type="button"
                >
                  <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>

          {demoMode ? (
            <NotificationEmptyState message="Notifications are unavailable in demo mode." />
          ) : !companyId ? (
            <NotificationEmptyState message="Select a workspace to see notifications." />
          ) : errorMessage ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
              {errorMessage}
            </div>
          ) : loading && items.length === 0 ? (
            <div className="grid gap-2 px-1 py-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="h-20 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
                  key={index}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <NotificationEmptyState message="Nothing new right now. Assigned work and pipeline changes will show up here." />
          ) : (
            <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
              {items.map((item) => {
                const unread = !readState[item.id];
                return (
                  <Link
                    className={`rounded-2xl border px-4 py-3 transition ${
                      unread
                        ? "border-[var(--accent-soft)] bg-[color-mix(in_srgb,_var(--accent-soft)_32%,_white)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                    }`}
                    href={item.href}
                    key={item.id}
                    onClick={() => {
                      handleMarkAsRead(item.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                        <NotificationIcon kind={item.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {item.title}
                          </p>
                          {unread ? (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--signal-red)]" />
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                          {item.body}
                        </p>
                        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                          {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationIcon({
  kind,
}: Readonly<{
  kind: DashboardNotificationKind;
}>) {
  if (kind === "task_pending" || kind === "task_due") {
    return <Clock3 aria-hidden="true" className="h-4 w-4" />;
  }

  if (kind === "deal_assigned") {
    return <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />;
  }

  return <Target aria-hidden="true" className="h-4 w-4" />;
}

function NotificationEmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
      {message}
    </div>
  );
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return "Recently";
  }

  const diffMs = time - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  return rtf.format(Math.round(diffMs / day), "day");
}
