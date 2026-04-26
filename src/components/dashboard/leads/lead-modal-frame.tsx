"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

const noopSubscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function LeadModalFrame({
  children,
  onClose,
}: Readonly<{
  children: ReactNode;
  onClose: () => void;
}>) {
  const mounted = useSyncExternalStore(noopSubscribe, getClient, getServer);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[color-mix(in_srgb,_var(--text-primary)_45%,_transparent)] px-0 pt-10 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-y-auto rounded-t-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:rounded-[var(--radius-card-lg)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
