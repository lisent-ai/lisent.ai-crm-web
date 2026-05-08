"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, FileText, Trash2, X } from "lucide-react";

type CustomerBulkActionBarProps = {
  count: number;
  exporting: boolean;
  onClear: () => void;
  onDelete: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportXlsx: () => void;
  saving: boolean;
};

const noopSubscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function CustomerBulkActionBar({
  count,
  exporting,
  onClear,
  onDelete,
  onExportCsv,
  onExportPdf,
  onExportXlsx,
  saving,
}: Readonly<CustomerBulkActionBarProps>) {
  const t = useTranslations();
  const mounted = useSyncExternalStore(noopSubscribe, getClient, getServer);

  if (!mounted || count === 0) {
    return null;
  }

  // Export and delete both touch backend / heavy client work, so we lock
  // the whole bar while either is in flight rather than letting users
  // queue up a delete behind a still-running PDF render.
  const busy = saving || exporting;

  return createPortal(
    <div
      aria-label={t("customers.bulk.regionLabel", { count })}
      className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-3 sm:px-4"
      role="region"
    >
      <div className="flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--text-primary)] px-2 py-2 shadow-[var(--shadow-float)] sm:max-w-[calc(100vw-2rem)] sm:gap-2 sm:px-3">
        <span className="whitespace-nowrap px-2 text-xs font-medium text-white sm:text-sm">
          {t("customers.bulk.selectedCount", { count })}
        </span>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          aria-label={t("customers.bulk.exportXlsx")}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50 sm:px-3"
          disabled={busy}
          onClick={onExportXlsx}
          type="button"
        >
          <FileSpreadsheet aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("customers.bulk.exportXlsx")}</span>
          <span className="sm:hidden">XLSX</span>
        </button>
        <button
          aria-label={t("customers.bulk.exportCsv")}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50 sm:px-3"
          disabled={busy}
          onClick={onExportCsv}
          type="button"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("customers.bulk.exportCsv")}</span>
          <span className="sm:hidden">CSV</span>
        </button>
        <button
          aria-label={t("customers.bulk.exportPdf")}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50 sm:px-3"
          disabled={busy}
          onClick={onExportPdf}
          type="button"
        >
          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("customers.bulk.exportPdf")}</span>
          <span className="sm:hidden">PDF</span>
        </button>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          aria-label={t("customers.delete")}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-[#fecaca] transition hover:bg-white/10 disabled:opacity-50 sm:px-3"
          disabled={busy}
          onClick={onDelete}
          type="button"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("customers.delete")}</span>
        </button>
        <span aria-hidden="true" className="h-5 w-px bg-white/20" />
        <button
          aria-label={t("customers.bulk.clearSelection")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          disabled={busy}
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
