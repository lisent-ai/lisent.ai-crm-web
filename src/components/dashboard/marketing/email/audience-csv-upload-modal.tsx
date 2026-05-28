"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useTranslations } from "next-intl";
import * as XLSX from "xlsx";

import {
  batchUpsertMailchimpMembers,
  CRMClientError,
} from "@/lib/crm/client";

// Extensions we accept on the file input + display in the dropzone hint.
// xlsx (SheetJS) handles all the spreadsheet formats; PapaParse stays
// for plain CSV / TSV / TXT because it streams and is friendlier to
// quoted multi-line cells.
const SPREADSHEET_EXTS = ["xlsx", "xls", "xlsm", "xlsb", "ods", "fods"] as const;
const TEXT_EXTS = ["csv", "tsv", "txt"] as const;
const ACCEPT_ATTR = [...SPREADSHEET_EXTS, ...TEXT_EXTS]
  .map((e) => `.${e}`)
  .join(",");

function extOf(file: File): string {
  const m = /\.([a-z0-9]+)$/i.exec(file.name);
  return m ? m[1].toLowerCase() : "";
}

// Spreadsheet parsing (xlsx + xls + ods + …) returns the same row
// shape PapaParse does — array of { header: cellValue } objects —
// so the downstream mapping UI works uniformly. Empty rows are
// dropped and trailing blank cells are coerced to "".
async function parseSpreadsheet(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  // defval:"" gives blank cells back as empty strings instead of skipping
  // them, which keeps column counts consistent across rows even when an
  // operator's source file has ragged trailing columns.
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

// PapaParse's ParseLocalConfig requires `complete`; we pass that at the
// call site below where we have the setState callbacks in scope. Splitting
// the static bit off via Pick keeps the option set declarative.
const PAPA_STATIC: Pick<
  Papa.ParseLocalConfig<Record<string, string>, File>,
  "header" | "skipEmptyLines" | "transformHeader"
> = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
};

// Mailchimp's documented per-call cap for batch upsert. The backend's
// BatchUpsertMembers passes through with the same ceiling; chunking
// across the boundary lets a CSV with thousands of rows succeed.
const BATCH_CHUNK_SIZE = 500;

// Column auto-detection: if the CSV uses common header names we map them
// automatically. Operators can still override via the mapping panel.
const HEADER_GUESSES: Record<string, string[]> = {
  email: ["email", "email address", "e-mail", "e mail", "mail"],
  fname: ["first name", "firstname", "fname", "given name", "ad", "isim"],
  lname: ["last name", "lastname", "lname", "surname", "family name", "soyad"],
  phone: ["phone", "phone number", "mobile", "telefon", "cep"],
  tags: ["tag", "tags", "labels", "etiket", "etiketler"],
};

function guessColumn(headers: string[], target: keyof typeof HEADER_GUESSES): string {
  const candidates = HEADER_GUESSES[target] ?? [];
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (candidates.includes(lower)) return h;
  }
  return "";
}

type AudienceCSVUploadModalProps = {
  companyId: string;
  listId: string;
  listName: string;
  onClose: () => void;
  onImported: (summary: { created: number; updated: number; errors: number }) => void;
};

type Progress = {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
};

// AudienceCSVUploadModal walks the operator through three steps:
//   1. Pick a CSV file (drag-drop OR file input)
//   2. Map columns: email is required; first/last/phone/tags are optional
//   3. Confirm + import — we chunk into 500-row batches and call the
//      composite endpoint, surfacing progress as each chunk completes.
//
// Mailchimp returns per-row results on errors (bad email shape, etc.).
// We aggregate the per-row outcomes across chunks so the operator sees
// "X created, Y updated, Z errors" at the end.
export function AudienceCSVUploadModal({
  companyId,
  listId,
  listName,
  onClose,
  onImported,
}: Readonly<AudienceCSVUploadModalProps>) {
  const t = useTranslations();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [emailCol, setEmailCol] = useState("");
  const [fnameCol, setFnameCol] = useState("");
  const [lnameCol, setLnameCol] = useState("");
  const [phoneCol, setPhoneCol] = useState("");
  const [tagsCol, setTagsCol] = useState("");
  const [statusDefault, setStatusDefault] = useState<
    "subscribed" | "pending" | "unsubscribed"
  >("subscribed");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  function applyParsed(data: Record<string, string>[]) {
    if (data.length === 0) {
      setError(t("marketing.email.audiences.csv.errEmpty"));
      return;
    }
    const cols = Object.keys(data[0]);
    setHeaders(cols);
    setRows(data);
    setEmailCol(guessColumn(cols, "email"));
    setFnameCol(guessColumn(cols, "fname"));
    setLnameCol(guessColumn(cols, "lname"));
    setPhoneCol(guessColumn(cols, "phone"));
    setTagsCol(guessColumn(cols, "tags"));
  }

  async function handleFile(file: File) {
    setError(null);
    const ext = extOf(file);
    // Spreadsheet formats route through SheetJS (xlsx, xls, ods, …).
    if ((SPREADSHEET_EXTS as readonly string[]).includes(ext)) {
      try {
        const data = await parseSpreadsheet(file);
        applyParsed(data.filter((row) => Object.keys(row).length > 0));
      } catch (err) {
        setError(
          `${t("marketing.email.audiences.csv.errParse")}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return;
    }
    // CSV / TSV / TXT — PapaParse streams these and handles quoted
    // multi-line cells better than the spreadsheet path.
    Papa.parse<Record<string, string>, File>(file, {
      ...PAPA_STATIC,
      complete: (result) => {
        const data = (result.data ?? []).filter((row) => Object.keys(row).length > 0);
        applyParsed(data);
      },
      error: (err) => {
        setError(`${t("marketing.email.audiences.csv.errParse")}: ${err.message}`);
      },
    });
  }

  async function handleImport() {
    setError(null);
    if (!emailCol) {
      setError(t("marketing.email.audiences.csv.errEmailColRequired"));
      return;
    }
    const members: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      const email = (row[emailCol] ?? "").trim();
      if (!email) continue;
      const merge: Record<string, string> = {};
      if (fnameCol && row[fnameCol]?.trim()) merge.FNAME = row[fnameCol].trim();
      if (lnameCol && row[lnameCol]?.trim()) merge.LNAME = row[lnameCol].trim();
      if (phoneCol && row[phoneCol]?.trim()) merge.PHONE = row[phoneCol].trim();

      const tags = tagsCol
        ? (row[tagsCol] ?? "")
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : undefined;

      members.push({
        email_address: email,
        status_if_new: statusDefault,
        merge_fields: merge,
        tags,
      });
    }
    if (members.length === 0) {
      setError(t("marketing.email.audiences.csv.errNoValidRows"));
      return;
    }

    const total = members.length;
    setProgress({ total, processed: 0, created: 0, updated: 0, errors: 0 });

    let created = 0;
    let updated = 0;
    let errors = 0;
    for (let i = 0; i < members.length; i += BATCH_CHUNK_SIZE) {
      const chunk = members.slice(i, i + BATCH_CHUNK_SIZE);
      try {
        const body = await batchUpsertMailchimpMembers(companyId, listId, {
          members: chunk,
          update_existing: updateExisting,
        });
        created += body.total_created ?? body.new_members?.length ?? 0;
        updated += body.total_updated ?? body.updated_members?.length ?? 0;
        errors += body.error_count ?? body.errors?.length ?? 0;
      } catch (err) {
        errors += chunk.length;
        setError(
          err instanceof CRMClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : t("marketing.email.audiences.csv.errChunk"),
        );
      }
      setProgress({
        total,
        processed: Math.min(i + chunk.length, total),
        created,
        updated,
        errors,
      });
    }
    onImported({ created, updated, errors });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("marketing.email.audiences.csv.title")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("marketing.email.audiences.csv.body", { audience: listName })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            aria-label={t("marketing.email.audiences.members.close")}
          >
            ✕
          </button>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {rows.length === 0 ? (
          <FilePicker
            label={t("marketing.email.audiences.csv.pickFile")}
            hint={t("marketing.email.audiences.csv.pickHint")}
            onFile={handleFile}
          />
        ) : progress ? (
          <ProgressView progress={progress} onClose={onClose} />
        ) : (
          <MappingView
            rowsCount={rows.length}
            sampleRow={rows[0]}
            headers={headers}
            emailCol={emailCol}
            setEmailCol={setEmailCol}
            fnameCol={fnameCol}
            setFnameCol={setFnameCol}
            lnameCol={lnameCol}
            setLnameCol={setLnameCol}
            phoneCol={phoneCol}
            setPhoneCol={setPhoneCol}
            tagsCol={tagsCol}
            setTagsCol={setTagsCol}
            statusDefault={statusDefault}
            setStatusDefault={setStatusDefault}
            updateExisting={updateExisting}
            setUpdateExisting={setUpdateExisting}
            onCancel={onClose}
            onSubmit={handleImport}
          />
        )}
      </div>
    </div>
  );
}

function FilePicker({
  label,
  hint,
  onFile,
}: Readonly<{ label: string; hint: string; onFile: (file: File) => void }>) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-10 text-center hover:bg-[var(--surface)]">
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>
      <input
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

type MappingViewProps = {
  rowsCount: number;
  sampleRow: Record<string, string>;
  headers: string[];
  emailCol: string;
  setEmailCol: (v: string) => void;
  fnameCol: string;
  setFnameCol: (v: string) => void;
  lnameCol: string;
  setLnameCol: (v: string) => void;
  phoneCol: string;
  setPhoneCol: (v: string) => void;
  tagsCol: string;
  setTagsCol: (v: string) => void;
  statusDefault: "subscribed" | "pending" | "unsubscribed";
  setStatusDefault: (v: "subscribed" | "pending" | "unsubscribed") => void;
  updateExisting: boolean;
  setUpdateExisting: (v: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

function MappingView(props: Readonly<MappingViewProps>) {
  const t = useTranslations();
  const {
    rowsCount,
    sampleRow,
    headers,
    emailCol,
    setEmailCol,
    fnameCol,
    setFnameCol,
    lnameCol,
    setLnameCol,
    phoneCol,
    setPhoneCol,
    tagsCol,
    setTagsCol,
    statusDefault,
    setStatusDefault,
    updateExisting,
    setUpdateExisting,
    onCancel,
    onSubmit,
  } = props;
  const options = ["", ...headers];
  return (
    <>
      <p className="text-sm text-[var(--text-secondary)]">
        {t("marketing.email.audiences.csv.rowsDetected", { count: rowsCount })}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MappingSelect
          label={t("marketing.email.audiences.csv.map.email")}
          value={emailCol}
          options={options}
          onChange={setEmailCol}
          required
          sample={emailCol ? sampleRow[emailCol] : undefined}
        />
        <MappingSelect
          label={t("marketing.email.audiences.csv.map.fname")}
          value={fnameCol}
          options={options}
          onChange={setFnameCol}
          sample={fnameCol ? sampleRow[fnameCol] : undefined}
        />
        <MappingSelect
          label={t("marketing.email.audiences.csv.map.lname")}
          value={lnameCol}
          options={options}
          onChange={setLnameCol}
          sample={lnameCol ? sampleRow[lnameCol] : undefined}
        />
        <MappingSelect
          label={t("marketing.email.audiences.csv.map.phone")}
          value={phoneCol}
          options={options}
          onChange={setPhoneCol}
          sample={phoneCol ? sampleRow[phoneCol] : undefined}
        />
        <MappingSelect
          label={t("marketing.email.audiences.csv.map.tags")}
          value={tagsCol}
          options={options}
          onChange={setTagsCol}
          sample={tagsCol ? sampleRow[tagsCol] : undefined}
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.audiences.csv.map.status")}
          </span>
          <select
            value={statusDefault}
            onChange={(e) =>
              setStatusDefault(
                e.target.value as "subscribed" | "pending" | "unsubscribed",
              )
            }
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="subscribed">
              {t("marketing.email.audiences.addMember.status.subscribed")}
            </option>
            <option value="pending">
              {t("marketing.email.audiences.addMember.status.pending")}
            </option>
            <option value="unsubscribed">
              {t("marketing.email.audiences.addMember.status.unsubscribed")}
            </option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={updateExisting}
          onChange={(e) => setUpdateExisting(e.target.checked)}
        />
        {t("marketing.email.audiences.csv.updateExisting")}
      </label>

      <footer className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
        >
          {t("integrations.mailchimp.cancel")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {t("marketing.email.audiences.csv.import")}
        </button>
      </footer>
    </>
  );
}

function MappingSelect({
  label,
  value,
  options,
  onChange,
  required,
  sample,
}: Readonly<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
  sample?: string;
}>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
        {required ? <span className="ml-1 text-[var(--signal-red)]">*</span> : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
      >
        {options.map((o) => (
          <option key={o || "(none)"} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
      {sample ? (
        <span className="truncate text-xs text-[var(--text-tertiary)]">{`e.g. ${sample}`}</span>
      ) : null}
    </label>
  );
}

function ProgressView({
  progress,
  onClose,
}: Readonly<{
  progress: Progress;
  onClose: () => void;
}>) {
  const t = useTranslations();
  const pct = progress.total === 0 ? 0 : (progress.processed / progress.total) * 100;
  const done = progress.processed === progress.total;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--text-primary)]">
        {done
          ? t("marketing.email.audiences.csv.done")
          : t("marketing.email.audiences.csv.importing", {
              processed: progress.processed,
              total: progress.total,
            })}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Stat label={t("marketing.email.audiences.csv.stat.created")} value={progress.created} />
        <Stat label={t("marketing.email.audiences.csv.stat.updated")} value={progress.updated} />
        <Stat
          label={t("marketing.email.audiences.csv.stat.errors")}
          value={progress.errors}
          dim={progress.errors === 0}
        />
      </dl>
      {done ? (
        <button
          type="button"
          onClick={onClose}
          className="self-end rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
        >
          {t("marketing.email.audiences.members.close")}
        </button>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  dim,
}: Readonly<{ label: string; value: number; dim?: boolean }>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border px-3 py-2 ${
        dim
          ? "border-[var(--border-subtle)] text-[var(--text-secondary)]"
          : "border-[var(--accent)] text-[var(--text-primary)]"
      }`}
    >
      <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold">{value}</dd>
    </div>
  );
}
