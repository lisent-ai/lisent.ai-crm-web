"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  applyImportProfile,
  approveImportProfile,
  CRMClientError,
  createCustomerFromImportPayload,
  suggestImportFromCSVUpload,
  suggestImportFromCSVURL,
} from "@/lib/crm/client";
import { parseCSVFile, parseCSVFromURL } from "@/lib/imports/csv";

type MappingRow = {
  header: string;
  sampleValue: string;
  targetField: string;
  confidence: number;
  reason: string;
};

type StepId = "source" | "preview" | "mapping";

type ImportProgress = {
  completed: number;
  total: number;
  currentLabel: string;
};

type AvailableField = {
  name: string;
  description: string;
};

const defaultAvailableFields: AvailableField[] = [
  { name: "name", description: "Full display name for the customer." },
  { name: "first_name", description: "Given name of the customer." },
  { name: "last_name", description: "Family name of the customer." },
  { name: "email", description: "Primary email address." },
  { name: "phone", description: "Primary phone number." },
  { name: "preferred_language", description: "Language code such as tr or en." },
  { name: "country_code", description: "Country code such as TR or DE." },
  { name: "subscription_date", description: "Signup or subscription date." },
  { name: "external_customer_id", description: "Source system identifier." },
];

const steps = [
  {
    id: "source" as const,
    stepNumber: "01",
    label: "Source",
    title: "Select the CSV source",
    summary: "Upload a CSV file or paste a direct CSV export URL.",
  },
  {
    id: "preview" as const,
    stepNumber: "02",
    label: "Preview",
    title: "Inspect parsed headers and sample rows",
    summary: "Confirm the structure before mapping any fields.",
  },
  {
    id: "mapping" as const,
    stepNumber: "03",
    label: "Mapping",
    title: "Review and approve field suggestions",
    summary: "Approve mapping, then continue to the company customer directory.",
  },
];

const stepSequence: StepId[] = ["source", "preview", "mapping"];

export function ImportWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceMode, setSourceMode] = useState<"upload" | "url">("upload");
  const [fallbackAliasesEnabled, setFallbackAliasesEnabled] = useState(true);
  const [activeStep, setActiveStep] = useState<StepId>("source");
  const [maxUnlockedStepIndex, setMaxUnlockedStepIndex] = useState(0);
  const [csvURL, setCSVURL] = useState("");
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, unknown>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [availableFields, setAvailableFields] =
    useState<AvailableField[]>(defaultAvailableFields);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [approving, setApproving] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const companyId = searchParams.get("company") ?? "";
  const companyName = searchParams.get("companyName") ?? "Selected company";
  const mappedCount = mappingRows.filter((row) => row.targetField !== "").length;
  const activeStepMeta = useMemo(
    () => steps.find((step) => step.id === activeStep) ?? steps[0],
    [activeStep],
  );

  function updateTargetField(header: string, targetField: string) {
    setMappingRows((current) =>
      current.map((row) =>
        row.header === header ? { ...row, targetField } : row,
      ),
    );
  }

  function goToStep(stepId: StepId) {
    const stepIndex = stepSequence.indexOf(stepId);

    if (stepIndex < 0 || stepIndex > maxUnlockedStepIndex) {
      return;
    }

    setActiveStep(stepId);
  }

  function unlockAndGo(stepId: StepId) {
    const stepIndex = stepSequence.indexOf(stepId);

    if (stepIndex < 0) {
      return;
    }

    setMaxUnlockedStepIndex((current) => Math.max(current, stepIndex));
    setActiveStep(stepId);
  }

  async function continueToPreview() {
    if (!companyId.trim()) {
      setErrorMessage("Open this page from a selected company first.");
      return;
    }

    setErrorMessage(null);
    setLoadingSuggestion(true);

    try {
      const parsedCSV =
        sourceMode === "upload"
          ? await parseSelectedFile(csvFile)
          : await parseSelectedURL(csvURL);

      const suggestion =
        sourceMode === "upload"
          ? await uploadAndSuggest(companyId, csvFile)
          : await suggestFromURL(companyId, csvURL);

      setAllRows(parsedCSV.rows);
      setHeaders(suggestion.headers);
      setSampleRows(suggestion.sampleRows);
      setAvailableFields(
        suggestion.availableFields.length > 0
          ? suggestion.availableFields.map((field) => ({
              name: field.name,
              description: field.description,
            }))
          : defaultAvailableFields,
      );
      setMappingRows(
        buildMappingRows(suggestion.headers, suggestion.sampleRows, suggestion.suggestions),
      );
      unlockAndGo("preview");
    } catch (error) {
      const message =
        error instanceof CRMClientError
          ? error.message
          : "Failed to parse CSV and generate suggestions.";
      setErrorMessage(message);
    } finally {
      setLoadingSuggestion(false);
    }
  }

  async function approveMapping() {
    if (!companyId.trim()) {
      setErrorMessage("Open this page from a selected company first.");
      return;
    }

    const mappingByField = buildMappingByField(mappingRows);
    if (Object.keys(mappingByField).length === 0) {
      setErrorMessage("Map at least one source header before approval.");
      return;
    }
    if (allRows.length === 0) {
      setErrorMessage("No CSV rows are loaded for import.");
      return;
    }

    setApproving(true);
    setImportProgress({
      completed: 0,
      total: allRows.length,
      currentLabel: allRows[0] ? describeImportRow(allRows[0], 1) : "",
    });
    setErrorMessage(null);

    try {
      await approveImportProfile(companyId, mappingByField, fallbackAliasesEnabled);
      await importCustomers(companyId, allRows, setImportProgress);
      router.push(
        `/dashboard/customers?company=${companyId}&companyName=${encodeURIComponent(companyName)}&source=import-approved&imported=${allRows.length}`,
      );
    } catch (error) {
      const message =
        error instanceof CRMClientError
          ? error.message
          : "Failed to approve mapping profile.";
      setErrorMessage(message);
    } finally {
      setApproving(false);
      setImportProgress(null);
    }
  }

  return (
    <div className="grid gap-6">
      {approving && importProgress && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
            <div className="flex items-center gap-4">
              <div className="size-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Import in progress
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Creating customer records
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              Step 3 is applying the approved CRM profile to each CSV row and
              creating customers. This screen stays open until the import finishes.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
                <span>
                  {importProgress.completed} / {importProgress.total} completed
                </span>
                <span>
                  {Math.round(
                    (importProgress.total === 0
                      ? 0
                      : (importProgress.completed / importProgress.total) * 100),
                  )}
                  %
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] transition-[width] duration-300"
                  style={{
                    width: `${Math.max(
                      8,
                      importProgress.total === 0
                        ? 0
                        : (importProgress.completed / importProgress.total) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Current row: {importProgress.currentLabel || "Preparing import..."}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Customer import
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {companyName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Import profiles are company-specific. The CSV preview and mapping
              suggestions below come from the CRM service through secured BFF routes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/dashboard/companies"
            >
              Back to companies
            </Link>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              Company ID: {companyId || "-"}
            </span>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7,_#f8fafc)] p-4 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Import steps</h2>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {activeStepMeta.stepNumber} / 03
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {steps.map((step) => {
              const active = step.id === activeStep;
              const stepIndex = stepSequence.indexOf(step.id);
              const unlocked = stepIndex <= maxUnlockedStepIndex;

              return (
                <button
                  className={`rounded-[1.4rem] border p-4 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                      : unlocked
                        ? "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                  disabled={!unlocked}
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  type="button"
                >
                  <p
                    className={`text-sm font-semibold uppercase tracking-[0.24em] ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Step {step.stepNumber}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">
                    {step.label}
                  </h3>
                  <p
                    className={`mt-3 text-sm leading-6 ${
                      active ? "text-slate-200" : unlocked ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {step.summary}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Progress
            </p>
            <div className="mt-3 grid gap-3">
              <Stat label="Headers" value={String(headers.length)} />
              <Stat label="Mapped fields" value={String(mappedCount)} />
              <Stat label="Rows loaded" value={String(allRows.length)} />
            </div>
          </div>
        </aside>

        <section className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
            Step {activeStepMeta.stepNumber}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {activeStepMeta.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {activeStepMeta.summary}
          </p>

          <div className="mt-8">
            {activeStep === "source" && (
              <div>
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                  <ToggleButton
                    active={sourceMode === "upload"}
                    label="Upload CSV"
                    onClick={() => setSourceMode("upload")}
                  />
                  <ToggleButton
                    active={sourceMode === "url"}
                    label="Use URL"
                    onClick={() => setSourceMode("url")}
                  />
                </div>

                {sourceMode === "upload" ? (
                  <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
                    <p className="text-base font-semibold text-slate-950">CSV upload</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Upload a sample CSV file. The backend reads headers and sample rows,
                      then asks Groq for mapping suggestions.
                    </p>
                    <input
                      accept=".csv,text/csv"
                      className="mt-5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null;
                        setCSVFile(nextFile);
                      }}
                      type="file"
                    />
                    <p className="mt-3 text-xs text-slate-500">
                      {csvFile ? `Selected: ${csvFile.name}` : "No file selected."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
                    <p className="text-base font-semibold text-slate-950">CSV URL</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Paste a direct CSV URL (for Google Sheets use the
                      `/export?format=csv` URL, not `/edit`).
                    </p>
                    <input
                      className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      onChange={(event) => setCSVURL(event.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0"
                      value={csvURL}
                    />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loadingSuggestion}
                    onClick={() => void continueToPreview()}
                    type="button"
                  >
                    {loadingSuggestion ? "Processing..." : "Continue to preview"}
                  </button>
                </div>
              </div>
            )}

            {activeStep === "preview" && (
              <div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Stat label="Headers" value={String(headers.length)} />
                  <Stat label="Rows shown" value={String(sampleRows.length)} />
                  <Stat label="Rows loaded" value={String(allRows.length)} />
                  <Stat label="Unmapped" value={String(headers.length - mappedCount)} />
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-800">
                      <thead className="bg-slate-100 text-xs uppercase tracking-[0.22em] text-slate-500">
                        <tr>
                          {headers.map((header) => (
                            <th className="px-4 py-3 font-medium" key={header}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.map((row, index) => (
                          <tr
                            className="border-t border-slate-200 bg-white"
                            key={`sample-row-${index + 1}`}
                          >
                            {headers.map((header) => (
                              <td className="px-4 py-3 text-slate-700" key={header}>
                                {formatCellValue(row[header])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                    onClick={() => goToStep("source")}
                    type="button"
                  >
                    Back to source
                  </button>
                  <button
                    className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
                    onClick={() => unlockAndGo("mapping")}
                    type="button"
                  >
                    Continue to mapping
                  </button>
                </div>
              </div>
            )}

            {activeStep === "mapping" && (
              <div>
                <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800">
                  <input
                    checked={fallbackAliasesEnabled}
                    className="size-4 accent-slate-900"
                    onChange={(event) => setFallbackAliasesEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  Enable fallback aliases
                </label>

                <div className="mt-6 grid gap-4">
                  {mappingRows.map((row) => (
                    <div
                      className="grid gap-4 rounded-[1.4rem] border border-slate-200 bg-white p-5 md:grid-cols-[0.95fr_1fr_1.15fr]"
                      key={row.header}
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Source header
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-slate-950">
                          {row.header}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Sample: {row.sampleValue || "-"}
                        </p>
                      </div>

                      <div className="relative z-20">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Target field
                        </p>
                        <select
                          className="relative mt-2 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-slate-900"
                          onChange={(event) =>
                            updateTargetField(row.header, event.target.value)
                          }
                          value={row.targetField}
                        >
                          <option className="bg-white text-slate-900" value="">
                            Leave unmapped
                          </option>
                          {availableFields.map((field) => (
                            <option
                              className="bg-white text-slate-900"
                              key={field.name}
                              value={field.name}
                            >
                              {field.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                          {
                            availableFields.find(
                              (field) => field.name === row.targetField,
                            )?.description
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Suggestion note
                        </p>
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                          {row.reason}
                          <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                            Confidence {Math.round(row.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-white p-5">
                  <p className="text-lg font-semibold text-slate-950">
                    Approval outcome
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    After approval, the active profile is saved and every loaded
                    CSV row is transformed through the CRM import profile and sent
                    to `/customers` before redirecting to the customer directory.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={approving}
                      onClick={() => void approveMapping()}
                      type="button"
                    >
                      {approving ? "Importing..." : "Approve mapping and import customers"}
                    </button>
                    <button
                      className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                      onClick={() => goToStep("preview")}
                      type="button"
                    >
                      Back to preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

async function uploadAndSuggest(companyId: string, file: File | null) {
  if (!file) {
    throw new CRMClientError("Please choose a CSV file first.", 400);
  }
  return suggestImportFromCSVUpload(companyId, file);
}

async function suggestFromURL(companyId: string, fileURL: string) {
  if (fileURL.trim() === "") {
    throw new CRMClientError("Please enter a CSV export URL first.", 400);
  }
  return suggestImportFromCSVURL(companyId, fileURL);
}

async function parseSelectedFile(file: File | null) {
  if (!file) {
    throw new CRMClientError("Please choose a CSV file first.", 400);
  }
  return parseCSVFile(file);
}

async function parseSelectedURL(fileURL: string) {
  if (fileURL.trim() === "") {
    throw new CRMClientError("Please enter a CSV export URL first.", 400);
  }

  try {
    return await parseCSVFromURL(fileURL);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch CSV URL.";
    throw new CRMClientError(message, 400);
  }
}

async function importCustomers(
  companyId: string,
  rows: Record<string, string>[],
  onProgress?: (progress: ImportProgress) => void,
) {
  const total = rows.length;

  for (const [index, row] of rows.entries()) {
    const currentLabel = describeImportRow(row, index + 1);
    onProgress?.({
      completed: index,
      total,
      currentLabel,
    });
    const payload = await applyImportProfile(companyId, row);
    await createCustomerFromImportPayload(companyId, payload);
    onProgress?.({
      completed: index + 1,
      total,
      currentLabel,
    });
  }
}

function describeImportRow(row: Record<string, string>, rowNumber: number) {
  const keys = ["name", "full_name", "first_name", "email", "phone"];
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }

  for (const value of Object.values(row)) {
    if (value.trim() !== "") {
      return value.trim();
    }
  }

  return `Row ${rowNumber}`;
}

function buildMappingRows(
  headers: string[],
  sampleRows: Record<string, unknown>[],
  suggestions: Array<{
    target_field: string;
    source_headers: string[];
    confidence: number;
    reason: string;
  }>,
): MappingRow[] {
  return headers.map((header) => {
    const suggestion = suggestions.find((item) =>
      item.source_headers.includes(header),
    );

    return {
      header,
      sampleValue: sampleValueForHeader(sampleRows, header),
      targetField: suggestion?.target_field ?? "",
      confidence: suggestion?.confidence ?? 0,
      reason: suggestion?.reason ?? "No strong suggestion from AI.",
    };
  });
}

function sampleValueForHeader(
  sampleRows: Record<string, unknown>[],
  header: string,
): string {
  for (const row of sampleRows) {
    const value = row[header];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function buildMappingByField(rows: MappingRow[]) {
  const out: Record<string, string[]> = {};

  for (const row of rows) {
    const target = row.targetField.trim();
    if (target === "") {
      continue;
    }
    if (!out[target]) {
      out[target] = [];
    }
    out[target].push(row.header);
  }

  return out;
}

function formatCellValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

function ToggleButton({
  active,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]"
          : "text-slate-600 hover:text-slate-950"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
