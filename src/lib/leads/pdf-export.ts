"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import type { Lead } from "@/lib/crm/client";
import { localeToBcp47, type SupportedLocale } from "@/lib/i18n/config";

(pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { vfs: unknown }).vfs;

type Translator = (key: string, params?: Record<string, string | number>) => string;

const STATUS_KEYS = ["new", "contacted", "qualified", "converted", "lost"] as const;

function statusLabel(t: Translator, status: string): string {
  if ((STATUS_KEYS as readonly string[]).includes(status)) {
    return t(`leads.status.${status}` as never);
  }
  return status || "—";
}

function formatDate(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(localeToBcp47[locale], {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function buildLeadPdfDefinition(
  leads: readonly Lead[],
  t: Translator,
  locale: SupportedLocale,
): TDocumentDefinitions {
  const headers = [
    t("leads.table.name"),
    t("leads.pdf.email"),
    t("leads.table.phone"),
    t("leads.table.status"),
    t("leads.table.source"),
    t("leads.table.assignee"),
    t("leads.pdf.createdAt"),
  ];

  const rows = leads.map((lead) => [
    lead.name || "—",
    lead.email || "—",
    lead.phone || "—",
    statusLabel(t, lead.status),
    lead.source || "—",
    lead.assigneeUserName || "—",
    formatDate(lead.createdAt, locale),
  ]);

  const exportedAt = new Intl.DateTimeFormat(localeToBcp47[locale], {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return {
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [32, 64, 32, 56],
    info: { title: t("leads.pdf.title"), creator: "Lisent CRM" },
    content: [
      { text: t("leads.pdf.title"), style: "header" },
      {
        text: t("leads.pdf.exportedAt", {
          count: leads.length,
          date: exportedAt,
        }),
        style: "subheader",
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
          body: [
            headers.map((h) => ({ text: h, style: "tableHeader" })),
            ...rows,
          ],
        },
        layout: {
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? "#f3f4f6" : rowIndex % 2 === 0 ? "#fafafa" : null,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#e5e7eb",
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 6,
          paddingRight: () => 6,
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "Lisent CRM", fontSize: 8, color: "#9ca3af", margin: [40, 16, 0, 0] },
        {
          text: t("leads.pdf.pageOf", { current: currentPage, total: pageCount }),
          alignment: "right",
          fontSize: 8,
          color: "#9ca3af",
          margin: [0, 16, 40, 0],
        },
      ],
    }),
    styles: {
      header: { fontSize: 18, bold: true, marginBottom: 4 },
      subheader: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
      tableHeader: { bold: true, fontSize: 9, color: "#374151" },
    },
    defaultStyle: { fontSize: 9, color: "#111827" },
  };
}

export function downloadLeadPdf(
  leads: readonly Lead[],
  filename: string,
  t: Translator,
  locale: SupportedLocale,
): void {
  const definition = buildLeadPdfDefinition(leads, t, locale);
  pdfMake.createPdf(definition).download(filename);
}
