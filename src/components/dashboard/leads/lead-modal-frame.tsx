"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function LeadModalFrame({
  children,
  onClose,
}: Readonly<{
  children: ReactNode;
  onClose: () => void;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
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
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(11,15,25,0.45)] px-4 py-8 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-auto w-full max-w-3xl rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
