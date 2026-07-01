"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Archive, Download, FileText, UserPlus, X } from "lucide-react";

type LeadBulkActionBarProps = {
  canAssign: boolean;
  count: number;
  onAssign: () => void;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
  onExportPdf: () => void;
  saving: boolean;
};

export function LeadBulkActionBar({
  canAssign,
  count,
  onAssign,
  onClear,
  onDelete,
  onExport,
  onExportPdf,
  saving,
}: Readonly<LeadBulkActionBarProps>) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || count === 0) return null;

  return createPortal(
    <div
      aria-label={t("leads.bulkBar.ariaSelected", { count })}
      className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4"
      role="region"
    >
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--text-primary)] px-3 py-2 shadow-[var(--shadow-float)]">
        <span className="whitespace-nowrap px-2 text-sm font-medium text-white">
          {t("leads.bulkBar.selected", { count })}
        </span>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
          disabled={saving || !canAssign}
          onClick={onAssign}
          type="button"
        >
          <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("leads.bulkBar.assign")}</span>
        </button>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
          disabled={saving}
          onClick={onExport}
          type="button"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("leads.bulkBar.exportCsv")}</span>
          <span className="sm:hidden">CSV</span>
        </button>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
          disabled={saving}
          onClick={onExportPdf}
          type="button"
        >
          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("leads.bulkBar.exportPdf")}</span>
          <span className="sm:hidden">PDF</span>
        </button>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#fecaca] transition hover:bg-white/10 disabled:opacity-50"
          disabled={saving}
          onClick={onDelete}
          type="button"
        >
          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
          {t("leads.bulkBar.archive")}
        </button>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          aria-label={t("leads.bulkBar.clearSelection")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
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
