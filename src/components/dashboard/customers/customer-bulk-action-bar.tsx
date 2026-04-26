"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";

type CustomerBulkActionBarProps = {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  saving: boolean;
};

const noopSubscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function CustomerBulkActionBar({
  count,
  onClear,
  onDelete,
  saving,
}: Readonly<CustomerBulkActionBarProps>) {
  const t = useTranslations();
  const mounted = useSyncExternalStore(noopSubscribe, getClient, getServer);

  if (!mounted || count === 0) {
    return null;
  }

  return createPortal(
    <div
      aria-label={t("customers.bulk.regionLabel", { count })}
      className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4"
      role="region"
    >
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--text-primary)] px-3 py-2 shadow-[var(--shadow-float)]">
        <span className="whitespace-nowrap px-2 text-sm font-medium text-white">
          {t("customers.bulk.selectedCount", { count })}
        </span>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#fecaca] transition hover:bg-white/10 disabled:opacity-50"
          disabled={saving}
          onClick={onDelete}
          type="button"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          {t("customers.delete")}
        </button>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          aria-label={t("customers.bulk.clearSelection")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          disabled={saving}
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
