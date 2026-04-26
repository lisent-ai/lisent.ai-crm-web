import type { ReactNode } from "react";

export function DealModalFrame({
  children,
  onClose,
}: Readonly<{
  children: ReactNode;
  onClose: () => void;
}>) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,_var(--text-primary)_35%,_transparent)] px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-4xl rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        {children}
      </div>
    </div>
  );
}
