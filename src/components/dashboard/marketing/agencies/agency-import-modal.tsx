"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import {
  CRMClientError,
  importAgencies,
  type AgencyImportRow,
  type AgencyImportResponse,
  type AgencyStatus,
} from "@/lib/crm/client";

// File extensions we accept. SheetJS handles the Excel/ODS family,
// PapaParse handles the plain-text formats. Same split as the audience
// upload modal so operators get a consistent set of accepted formats
// across the marketing module.
const SPREADSHEET_EXTS = ["xlsx", "xls", "xlsm", "xlsb", "ods", "fods"] as const;
const TEXT_EXTS = ["csv", "tsv", "txt"] as const;
const ACCEPT_ATTR = [...SPREADSHEET_EXTS, ...TEXT_EXTS]
  .map((e) => `.${e}`)
  .join(",");

function extOf(file: File): string {
  const m = /\.([a-z0-9]+)$/i.exec(file.name);
  return m ? m[1].toLowerCase() : "";
}

async function parseSpreadsheet(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, string | number | boolean>>(
    sheet,
    { defval: "", raw: false },
  );
  return json.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[String(k).trim()] = v === undefined || v === null ? "" : String(v);
    }
    return out;
  });
}

// Header guesses cover the common shapes operators paste — English +
// Turkish — so the column mapping is right by default for typical
// spreadsheets. Mapping can still be overridden field by field.
const HEADER_GUESSES: Record<string, string[]> = {
  name: ["name", "agency", "agency name", "company", "ad", "acente", "acente adı"],
  contact: ["contact", "contact person", "contact name", "yetkili", "yetkili kişi"],
  phone: ["phone", "phone number", "mobile", "tel", "telefon", "cep"],
  email: ["email", "email address", "e-mail", "mail"],
  notes: ["notes", "note", "comments", "açıklama", "not"],
  starts: ["starts", "starts at", "start date", "başlangıç", "başlangıç tarihi"],
  ends: ["ends", "ends at", "end date", "bitiş", "bitiş tarihi"],
  status: ["status", "durum"],
  tags: ["tags", "tag", "labels", "etiket", "etiketler"],
};

function guessColumn(
  headers: string[],
  target: keyof typeof HEADER_GUESSES,
): string {
  const candidates = HEADER_GUESSES[target] ?? [];
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (candidates.includes(lower)) return h;
  }
  return "";
}

const PAPA_STATIC: Pick<
  Papa.ParseLocalConfig<Record<string, string>, File>,
  "header" | "skipEmptyLines" | "transformHeader"
> = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
};

type AgencyImportModalProps = {
  companyId: string;
  onClose: () => void;
  onImported: (summary: AgencyImportResponse) => void;
};

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// AgencyImportModal — three-step flow matching the audience upload:
//   1. Pick a file (drag-drop or button)
//   2. Map columns — Name is required; the rest are optional
//   3. Import — single backend call (no client-side chunking; the
//      backend's import endpoint caps at 5000 rows per request)
//
// We do NOT deduplicate. Operators told us during the audience work
// they prefer to clean spreadsheets themselves; the CRM should never
// silently merge or drop rows. Per-row errors come back from the
// server with the original index so they can patch the source sheet.
export function AgencyImportModal({
  companyId,
  onClose,
  onImported,
}: Readonly<AgencyImportModalProps>) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState("");
  const [contactCol, setContactCol] = useState("");
  const [phoneCol, setPhoneCol] = useState("");
  const [emailCol, setEmailCol] = useState("");
  const [notesCol, setNotesCol] = useState("");
  const [startsCol, setStartsCol] = useState("");
  const [endsCol, setEndsCol] = useState("");
  const [statusCol, setStatusCol] = useState("");
  const [tagsCol, setTagsCol] = useState("");
  const [statusDefault, setStatusDefault] = useState<AgencyStatus>("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgencyImportResponse | null>(null);

  function applyParsed(data: Record<string, string>[]) {
    if (data.length === 0) {
      setError("The file looks empty.");
      return;
    }
    const cols = Object.keys(data[0]);
    setHeaders(cols);
    setRows(data);
    setNameCol(guessColumn(cols, "name"));
    setContactCol(guessColumn(cols, "contact"));
    setPhoneCol(guessColumn(cols, "phone"));
    setEmailCol(guessColumn(cols, "email"));
    setNotesCol(guessColumn(cols, "notes"));
    setStartsCol(guessColumn(cols, "starts"));
    setEndsCol(guessColumn(cols, "ends"));
    setStatusCol(guessColumn(cols, "status"));
    setTagsCol(guessColumn(cols, "tags"));
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    const ext = extOf(file);
    if ((SPREADSHEET_EXTS as readonly string[]).includes(ext)) {
      try {
        const data = await parseSpreadsheet(file);
        applyParsed(data.filter((r) => Object.keys(r).length > 0));
      } catch (err) {
        setError(
          `Could not parse the file: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return;
    }
    Papa.parse<Record<string, string>, File>(file, {
      ...PAPA_STATIC,
      complete: (res) => {
        const data = (res.data ?? []).filter((r) => Object.keys(r).length > 0);
        applyParsed(data);
      },
      error: (err) => setError(`Could not parse the file: ${err.message}`),
    });
  }

  // normalizeStatus accepts "Active" / "active" / "ACTIVE" / Turkish
  // equivalents and maps to the backend enum. Unknown values fall back
  // to the row-level default so a typo doesn't tank a 1000-row import.
  function normalizeStatus(raw: string): AgencyStatus {
    const v = raw.toLowerCase().trim();
    if (["inactive", "pasif"].includes(v)) return "inactive";
    if (["expired", "süresi dolmuş", "suresi dolmus"].includes(v)) return "expired";
    if (["active", "aktif"].includes(v)) return "active";
    return statusDefault;
  }

  async function handleImport() {
    setError(null);
    setResult(null);
    if (!nameCol) {
      setError("Pick a column for the agency name first.");
      return;
    }
    const payload: AgencyImportRow[] = [];
    for (const r of rows) {
      const name = (r[nameCol] ?? "").trim();
      if (!name) continue;
      const tags = tagsCol
        ? (r[tagsCol] ?? "")
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;
      payload.push({
        name,
        contact_person: contactCol ? (r[contactCol] ?? "").trim() || null : null,
        phone: phoneCol ? (r[phoneCol] ?? "").trim() || null : null,
        email: emailCol ? (r[emailCol] ?? "").trim() || null : null,
        notes: notesCol ? (r[notesCol] ?? "").trim() || null : null,
        starts_at: startsCol ? (r[startsCol] ?? "").trim() || null : null,
        ends_at: endsCol ? (r[endsCol] ?? "").trim() || null : null,
        status: statusCol
          ? normalizeStatus(r[statusCol] ?? "")
          : statusDefault,
        tags,
      });
    }
    if (payload.length === 0) {
      setError("No rows have a non-empty name.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await importAgencies(companyId, payload);
      setResult(res);
      onImported(res);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "The import failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Import agencies from a spreadsheet
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Accepts CSV, Excel (xlsx / xls / xlsm / xlsb) and OpenDocument
              (ods / fods). Name is the only required column.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            Close
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {rows.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-10 text-sm text-[var(--text-secondary)]">
              <span className="font-medium">Pick a spreadsheet</span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Click to choose. We&apos;ll read the first sheet only.
              </span>
              <input
                type="file"
                accept={ACCEPT_ATTR}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="mt-2"
              />
            </label>
          ) : (
            <>
              <div className="text-xs text-[var(--text-tertiary)]">
                Loaded {rows.length} row{rows.length === 1 ? "" : "s"} with{" "}
                {headers.length} column{headers.length === 1 ? "" : "s"}.
                Map each CRM field to the spreadsheet column it should come
                from.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Mapping label="Name (required)" value={nameCol} onChange={setNameCol} headers={headers} required />
                <Mapping label="Contact person" value={contactCol} onChange={setContactCol} headers={headers} />
                <Mapping label="Phone" value={phoneCol} onChange={setPhoneCol} headers={headers} />
                <Mapping label="Email" value={emailCol} onChange={setEmailCol} headers={headers} />
                <Mapping label="Notes" value={notesCol} onChange={setNotesCol} headers={headers} />
                <Mapping label="Starts at (YYYY-MM-DD)" value={startsCol} onChange={setStartsCol} headers={headers} />
                <Mapping label="Ends at (YYYY-MM-DD)" value={endsCol} onChange={setEndsCol} headers={headers} />
                <Mapping label="Status column" value={statusCol} onChange={setStatusCol} headers={headers} />
                <Mapping label="Tags (comma / semicolon separated)" value={tagsCol} onChange={setTagsCol} headers={headers} />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">
                    Default status (for rows without one)
                  </span>
                  <select
                    value={statusDefault}
                    onChange={(e) =>
                      setStatusDefault(e.target.value as AgencyStatus)
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
              </div>
              {result && (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
                  <div className="font-medium text-[var(--text-primary)]">
                    Import complete
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Created {result.created} of {result.total} rows.{" "}
                    {result.errors.length > 0 && (
                      <>{result.errors.length} rows had errors:</>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <ul className="mt-1 max-h-32 overflow-auto text-xs text-[var(--signal-red)]">
                      {result.errors.slice(0, 25).map((e) => (
                        <li key={e.index}>Row {e.index + 1}: {e.error}</li>
                      ))}
                      {result.errors.length > 25 && (
                        <li>… {result.errors.length - 25} more</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3">
          {error ? (
            <span className="text-xs text-[var(--signal-red)]">{error}</span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {rows.length > 0 && !result && (
              <button
                type="button"
                onClick={() => {
                  setRows([]);
                  setHeaders([]);
                  setError(null);
                }}
                className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
              >
                Pick a different file
              </button>
            )}
            {result ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || rows.length === 0}
                onClick={handleImport}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                {submitting ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Mapping({
  label,
  value,
  onChange,
  headers,
  required,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
  required?: boolean;
}>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[var(--text-primary)]">
        {label}
        {required ? <span className="ml-1 text-[var(--signal-red)]">*</span> : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">— (not used) —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
