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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,_var(--text-primary)_35%,_transparent)] px-0 pt-10 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-y-auto rounded-t-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-float)] sm:rounded-[var(--radius-card-lg)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        {children}
      </div>
    </div>
  );
}
