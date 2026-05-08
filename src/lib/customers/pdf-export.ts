"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import type { Customer } from "@/lib/crm/client";
import { localeToBcp47, type SupportedLocale } from "@/lib/i18n/config";

(pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { vfs: unknown }).vfs;

type Translator = (key: string, params?: Record<string, string | number>) => string;

export function buildCustomerPdfDefinition(
  customers: readonly Customer[],
  t: Translator,
  locale: SupportedLocale,
): TDocumentDefinitions {
  const headers = [
    t("customers.fields.name"),
    t("customers.fields.email"),
    t("customers.fields.phone"),
    t("customers.fields.status"),
    t("customers.fields.countryCode"),
    t("customers.fields.preferredLanguage"),
  ];

  const rows = customers.map((customer) => [
    customer.name || "—",
    customer.email || "—",
    customer.phone || "—",
    customer.status || "—",
    customer.countryCode || "—",
    customer.preferredLanguage || "—",
  ]);

  const exportedAt = new Intl.DateTimeFormat(localeToBcp47[locale], {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return {
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [32, 64, 32, 56],
    info: { title: t("customers.pdf.title"), creator: "Lisent CRM" },
    content: [
      { text: t("customers.pdf.title"), style: "header" },
      {
        text: t("customers.pdf.exportedAt", {
          count: customers.length,
          date: exportedAt,
        }),
        style: "subheader",
      },
      {
        table: {
          headerRows: 1,
          // "Name" gets natural width, "Email" is the elastic column,
          // the rest are auto so they shrink to their content.
          widths: ["auto", "*", "auto", "auto", "auto", "auto"],
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
          text: t("customers.pdf.pageOf", { current: currentPage, total: pageCount }),
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

export function downloadCustomerPdf(
  customers: readonly Customer[],
  filename: string,
  t: Translator,
  locale: SupportedLocale,
): void {
  const definition = buildCustomerPdfDefinition(customers, t, locale);
  pdfMake.createPdf(definition).download(filename);
}
