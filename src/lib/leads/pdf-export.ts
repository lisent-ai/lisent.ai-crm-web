"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";

import type { Lead } from "@/lib/crm/client";
import { localeToBcp47, type SupportedLocale } from "@/lib/i18n/config";

(pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { vfs: unknown }).vfs;

type Translator = (key: string, params?: Record<string, string | number>) => string;

const STATUS_KEYS = ["new", "contacted", "qualified", "disqualified", "converted", "lost"] as const;

// Snapshot is intentionally narrower than the full LeadComment so the PDF
// builder stays decoupled from CRM client typing — callers map LeadComment
// down to this shape before passing it in.
export type LeadCommentSnapshot = {
  authorUserName: string;
  body: string;
  createdAt: string;
};

export type LeadPdfOptions = {
  // When true, the table interleaves a notes sub-row directly under each
  // lead row: the lead's own notes field (filled in via the edit form)
  // plus its comment thread — only for leads that have either. When
  // false (default) the table matches the legacy table-only layout.
  includeComments?: boolean;
  // Caller pre-fetches comments and passes them keyed by lead.id. Leads
  // missing from the map (or with an empty list) simply get no sub-row,
  // which keeps the table compact.
  commentsByLeadId?: ReadonlyMap<string, readonly LeadCommentSnapshot[]>;
};

// Each table row carries a small descriptor so the layout callback can
// distinguish header / lead / comments rows without doing math on
// rowIndex. leadIndex is used to keep a lead row and its comment row in
// the same alternating tint so they read as one logical block.
type RowMeta =
  | { type: "header" }
  | { type: "lead"; leadIndex: number }
  | { type: "comments"; leadIndex: number };

const COLUMN_COUNT = 7;

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

function buildNotesStack(
  note: string,
  comments: readonly LeadCommentSnapshot[],
  t: Translator,
  locale: SupportedLocale,
): Content[] {
  const stack: Content[] = [];

  // The lead's own notes field (edited via the lead form) comes first,
  // under the same "Lead context" label the drawer's notes panel uses,
  // so the PDF mirrors what the user sees on screen.
  if (note) {
    stack.push({ text: t("leads.notes.leadContext"), style: "commentsInlineLabel" });
    stack.push({ text: note, style: "commentBody", margin: [0, 2, 0, 0] });
  }

  if (comments.length === 0) {
    return stack;
  }

  // The "Comments" label anchors the block visually so a reader scanning
  // the page never confuses an indented comment row with the next lead.
  stack.push({
    text: t("leads.pdf.commentsHeader"),
    style: "commentsInlineLabel",
    margin: note ? [0, 8, 0, 0] : [0, 0, 0, 0],
  });

  comments.forEach((comment, index) => {
    const author = comment.authorUserName?.trim() || t("leads.notes.unknownAuthor");
    const meta = t("leads.pdf.commentByOn", {
      author,
      date: formatDate(comment.createdAt, locale),
    });

    stack.push({
      stack: [
        { text: meta, style: "commentMeta" },
        { text: comment.body?.trim() || "—", style: "commentBody" },
      ],
      // Tighter top margin on the first comment so it hugs the label;
      // subsequent comments get a little more breathing room.
      margin: index === 0 ? [0, 2, 0, 0] : [0, 6, 0, 0],
    });
  });

  return stack;
}

export function buildLeadPdfDefinition(
  leads: readonly Lead[],
  t: Translator,
  locale: SupportedLocale,
  options: LeadPdfOptions = {},
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

  const includeComments = !!options.includeComments;
  const commentsByLeadId = options.commentsByLeadId ?? new Map();

  const tableBody: TableCell[][] = [];
  const rowMeta: RowMeta[] = [];

  // Header row — same as before.
  tableBody.push(headers.map((h) => ({ text: h, style: "tableHeader" })));
  rowMeta.push({ type: "header" });

  leads.forEach((lead, leadIndex) => {
    tableBody.push([
      lead.name || "—",
      lead.email || "—",
      lead.phone || "—",
      statusLabel(t, lead.status),
      lead.source || "—",
      lead.assigneeUserName || "—",
      formatDate(lead.createdAt, locale),
    ]);
    rowMeta.push({ type: "lead", leadIndex });

    if (!includeComments) return;

    const comments = commentsByLeadId.get(lead.id) ?? [];
    const note = lead.notes?.trim() ?? "";
    if (comments.length === 0 && !note) {
      // Skipping leads with no notes/comments keeps the table tight
      // rather than littering it with "no comments yet" placeholders.
      return;
    }

    // colSpan=COLUMN_COUNT lets the comment block stretch across all
    // columns so prose isn't squashed into the narrow Name column.
    // pdfmake requires the merged-with cells to be present as empty
    // placeholders for the row width to line up.
    const commentCell: TableCell = {
      colSpan: COLUMN_COUNT,
      stack: buildNotesStack(note, comments, t, locale),
      // Left margin indents the whole block so it visually sits "under"
      // the lead row above, mimicking a child-row pattern.
      margin: [16, 4, 8, 4],
    };
    const placeholders: TableCell[] = Array.from(
      { length: COLUMN_COUNT - 1 },
      () => "",
    );
    tableBody.push([commentCell, ...placeholders]);
    rowMeta.push({ type: "comments", leadIndex });
  });

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
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            const meta = rowMeta[rowIndex];
            if (!meta) return null;
            if (meta.type === "header") return "#f3f4f6";
            // Comment row reuses its lead row's tint so the two read as
            // a single grouped block — preserving the same alternating
            // rhythm the table-only layout has today.
            return meta.leadIndex % 2 === 0 ? null : "#fafafa";
          },
          hLineWidth: (rowIndex: number) => {
            const meta = rowMeta[rowIndex];
            const prev = rowMeta[rowIndex - 1];
            // Hide the divider between a lead row and its own comment
            // row so they look like one continuous block. Keep all other
            // dividers (between leads, and at the table top/bottom).
            if (meta?.type === "comments" && prev?.type === "lead") return 0;
            return 0.5;
          },
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
      commentsInlineLabel: {
        fontSize: 9,
        bold: true,
        color: "#374151",
        marginBottom: 2,
      },
      commentMeta: { fontSize: 8, color: "#6b7280" },
      commentBody: { fontSize: 9, color: "#1f2937" },
    },
    defaultStyle: { fontSize: 9, color: "#111827" },
  };
}

export function downloadLeadPdf(
  leads: readonly Lead[],
  filename: string,
  t: Translator,
  locale: SupportedLocale,
  options: LeadPdfOptions = {},
): void {
  const definition = buildLeadPdfDefinition(leads, t, locale, options);
  pdfMake.createPdf(definition).download(filename);
}
