"use client";

import type { Customer } from "@/lib/crm/client";

// Minimal in-house XLSX writer.
//
// Why not pull in a library:
// - `xlsx` (SheetJS) and `exceljs` are 1–3 MB each, far heavier than the
//   feature requires (single sheet, inline strings, no styling).
// - This module produces the smallest valid OOXML workbook: 5 XML parts
//   bundled in a STORE-only ZIP. All major spreadsheet apps (Excel,
//   Numbers, Google Sheets, LibreOffice) open it without a warning.
// - All cells go in as inline strings (`t="inlineStr"`) so we avoid the
//   sharedStrings.xml dance entirely. Numeric coercion is deliberately
//   skipped — phone numbers and IDs stay as text and don't lose leading
//   zeros or get reformatted to scientific notation by Excel.
//
// If we ever need styling, multiple sheets, or formula support, the
// honest answer is to swap this for `exceljs` rather than grow this file.

const enc = new TextEncoder();

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  // Standard IEEE 802.3 CRC-32 table — built once and cached on the
  // module so repeat calls don't pay the 256-iteration setup again.
  if (!crcTable) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    crcTable = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ bytes[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetter(zeroBasedIndex: number): string {
  // 0 → "A", 25 → "Z", 26 → "AA", … standard spreadsheet column naming.
  let n = zeroBasedIndex + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

type ZipFile = { name: string; content: string };

function buildZip(files: readonly ZipFile[]): Uint8Array {
  // STORE-only (compression method 0). No deflate, no streaming — fine
  // for a workbook of a few KB. Modern browsers/Excel decompress it
  // instantly and the file size stays small enough not to matter.
  type LocalEntry = {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    size: number;
    offset: number;
  };

  const entries: LocalEntry[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const data = enc.encode(file.content);
    const nameBytes = enc.encode(file.name);
    const crc = crc32(data);
    const size = data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // local file header signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression: STORE
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true); // compressed size
    view.setUint32(22, size, true); // uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);

    entries.push({ nameBytes, data, crc, size, offset });
    chunks.push(localHeader);
    chunks.push(data);
    offset += localHeader.length + data.length;
  }

  const centralStart = offset;
  for (const entry of entries) {
    const cd = new Uint8Array(46 + entry.nameBytes.length);
    const v = new DataView(cd.buffer);
    v.setUint32(0, 0x02014b50, true); // central dir signature
    v.setUint16(4, 20, true); // version made by
    v.setUint16(6, 20, true); // version needed
    v.setUint16(8, 0, true); // flags
    v.setUint16(10, 0, true); // compression
    v.setUint16(12, 0, true); // mod time
    v.setUint16(14, 0, true); // mod date
    v.setUint32(16, entry.crc, true);
    v.setUint32(20, entry.size, true); // compressed size
    v.setUint32(24, entry.size, true); // uncompressed size
    v.setUint16(28, entry.nameBytes.length, true);
    v.setUint16(30, 0, true); // extra length
    v.setUint16(32, 0, true); // comment length
    v.setUint16(34, 0, true); // disk number
    v.setUint16(36, 0, true); // internal attrs
    v.setUint32(38, 0, true); // external attrs
    v.setUint32(42, entry.offset, true);
    cd.set(entry.nameBytes, 46);
    chunks.push(cd);
    offset += cd.length;
  }
  const centralSize = offset - centralStart;

  const eocd = new Uint8Array(22);
  const e = new DataView(eocd.buffer);
  e.setUint32(0, 0x06054b50, true); // end-of-central-directory signature
  e.setUint16(4, 0, true); // disk number
  e.setUint16(6, 0, true); // disk with central dir
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, centralStart, true);
  e.setUint16(20, 0, true); // comment length
  chunks.push(eocd);

  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

function buildWorkbook(sheetName: string): string {
  // Sheet names cannot contain []*?:/\ and must be ≤ 31 chars. The
  // caller is expected to pass a sanitized label, but we hard-cap here
  // as a final defense.
  const safe = sheetName.replace(/[\\/?*\[\]:]/g, "").slice(0, 31) || "Sheet1";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(safe)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

function buildSheet(rows: readonly (readonly string[])[]): string {
  const xmlRows = rows
    .map((row, rIdx) => {
      const cells = row
        .map((cell, cIdx) => {
          const ref = `${columnLetter(cIdx)}${rIdx + 1}`;
          // `xml:space="preserve"` keeps leading/trailing spaces in
          // values (rare but possible in user data) from being stripped
          // by spreadsheet parsers.
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
}

export type CustomerXlsxOptions = {
  // Optional human-readable column headers to render in row 1. If
  // omitted, the same machine-friendly slugs as the CSV are used so the
  // two formats stay aligned for diff/import workflows.
  headers?: readonly string[];
  // Optional sheet name shown on the tab in Excel. Defaults to
  // "Customers" so the file looks sensible even without i18n wiring.
  sheetName?: string;
};

const DEFAULT_HEADERS = [
  "id",
  "company_id",
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "status",
  "preferred_language",
  "country_code",
] as const;

export function buildCustomerXlsx(
  customers: readonly Customer[],
  options: CustomerXlsxOptions = {},
): Blob {
  const headers = options.headers ?? DEFAULT_HEADERS;
  const sheetName = options.sheetName ?? "Customers";

  const rows: string[][] = [
    [...headers],
    ...customers.map((customer) => [
      customer.id,
      customer.companyId,
      customer.name,
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.status,
      customer.preferredLanguage,
      customer.countryCode,
    ]),
  ];

  const zip = buildZip([
    { name: "[Content_Types].xml", content: CONTENT_TYPES },
    { name: "_rels/.rels", content: ROOT_RELS },
    { name: "xl/_rels/workbook.xml.rels", content: WORKBOOK_RELS },
    { name: "xl/workbook.xml", content: buildWorkbook(sheetName) },
    { name: "xl/worksheets/sheet1.xml", content: buildSheet(rows) },
  ]);

  // Cast through `ArrayBuffer` because TS 5 narrows Uint8Array's
  // backing buffer to `ArrayBufferLike` (which includes SharedArrayBuffer),
  // and Blob's BlobPart type requires a plain ArrayBuffer view. The
  // backing store here is always a fresh ArrayBuffer.
  return new Blob([zip.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadCustomerXlsx(
  customers: readonly Customer[],
  filename: string,
  options: CustomerXlsxOptions = {},
): void {
  const blob = buildCustomerXlsx(customers, options);
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
