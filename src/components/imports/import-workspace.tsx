"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  applyImportProfile,
  approveImportProfile,
  CRMClientError,
  createCustomerFromImportPayload,
  suggestImportFromCSVUpload,
  suggestImportFromCSVURL,
} from "@/lib/crm/client";
import { parseCSVFile, parseCSVFromURL } from "@/lib/imports/csv";
import { defaultAvailableFields, steps, stepSequence } from "./import-config";
import { ImportMappingStep } from "./import-mapping-step";
import { ImportPreviewStep } from "./import-preview-step";
import { ImportProgressModal } from "./import-progress-modal";
import { ImportSourceStep } from "./import-source-step";
import { ImportStepsSidebar } from "./import-steps-sidebar";
import {
  buildMappingByField,
  buildMappingRows,
  describeImportRow,
} from "./import-utils";
import {
  type AvailableField,
  type ImportProgress,
  type MappingRow,
  type StepId,
} from "./import-types";

export function ImportWorkspace() {
  const t = useTranslations();
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
  const companyName = searchParams.get("companyName") ?? t("imports.workspace.selectedCompany");
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
      setErrorMessage(t("imports.errors.openFromCompany"));
      return;
    }

    setErrorMessage(null);
    setLoadingSuggestion(true);

    try {
      const parsedCSV =
        sourceMode === "upload"
          ? await parseSelectedFile(csvFile, t as never)
          : await parseSelectedURL(csvURL, t as never);

      const suggestion =
        sourceMode === "upload"
          ? await uploadAndSuggest(companyId, csvFile, t as never)
          : await suggestFromURL(companyId, csvURL, t as never);

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
        buildMappingRows(
          suggestion.headers,
          suggestion.sampleRows,
          suggestion.suggestions,
          suggestion.availableFields.length > 0
            ? suggestion.availableFields.map((field) => ({
                name: field.name,
                description: field.description,
              }))
            : defaultAvailableFields,
          t as never,
        ),
      );
      unlockAndGo("preview");
    } catch (error) {
      const message =
        error instanceof CRMClientError
          ? error.message
          : t("imports.errors.parseFailed");
      setErrorMessage(message);
    } finally {
      setLoadingSuggestion(false);
    }
  }

  async function approveMapping() {
    if (!companyId.trim()) {
      setErrorMessage(t("imports.errors.openFromCompany"));
      return;
    }

    const mappingByField = buildMappingByField(mappingRows);
    if (Object.keys(mappingByField).length === 0) {
      setErrorMessage(t("imports.errors.mapAtLeastOne"));
      return;
    }
    if (allRows.length === 0) {
      setErrorMessage(t("imports.errors.noRows"));
      return;
    }

    setApproving(true);
    setImportProgress({
      completed: 0,
      total: allRows.length,
      currentLabel: allRows[0] ? describeImportRow(allRows[0], 1, t as never) : "",
    });
    setErrorMessage(null);

    try {
      await approveImportProfile(companyId, mappingByField, fallbackAliasesEnabled);
      await importCustomers(companyId, allRows, setImportProgress, t as never);
      router.push(
        `/dashboard/customers?company=${companyId}&companyName=${encodeURIComponent(companyName)}&source=import-approved&imported=${allRows.length}`,
      );
    } catch (error) {
      const message =
        error instanceof CRMClientError
          ? error.message
          : t("imports.errors.approveFailed");
      setErrorMessage(message);
    } finally {
      setApproving(false);
      setImportProgress(null);
    }
  }

  return (
    <div className="grid gap-6">
      {approving && importProgress && <ImportProgressModal progress={importProgress} />}

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              {t("imports.workspace.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {companyName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {t("imports.workspace.description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/dashboard"
            >
              {t("imports.workspace.backToOverview")}
            </Link>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              {t("imports.workspace.companyIdLabel")}: {companyId || "-"}
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
        <ImportStepsSidebar
          activeStep={activeStep}
          headersCount={headers.length}
          mappedCount={mappedCount}
          maxUnlockedStepIndex={maxUnlockedStepIndex}
          onGoToStep={goToStep}
          rowsLoaded={allRows.length}
        />

        <section className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
            {t("imports.workspace.stepLabel", { step: activeStepMeta.stepNumber })}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {t(activeStepMeta.titleKey as never)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {t(activeStepMeta.summaryKey as never)}
          </p>

          <div className="mt-8">
            {activeStep === "source" && (
              <ImportSourceStep
                csvFile={csvFile}
                csvURL={csvURL}
                loadingSuggestion={loadingSuggestion}
                onContinue={() => void continueToPreview()}
                onSetCSVFile={setCSVFile}
                onSetCSVURL={setCSVURL}
                onSetSourceMode={setSourceMode}
                sourceMode={sourceMode}
              />
            )}

            {activeStep === "preview" && (
              <ImportPreviewStep
                allRowsCount={allRows.length}
                headers={headers}
                mappedCount={mappedCount}
                onBack={() => goToStep("source")}
                onContinue={() => unlockAndGo("mapping")}
                sampleRows={sampleRows}
              />
            )}

            {activeStep === "mapping" && (
              <ImportMappingStep
                approving={approving}
                availableFields={availableFields}
                fallbackAliasesEnabled={fallbackAliasesEnabled}
                mappingRows={mappingRows}
                onApprove={() => void approveMapping()}
                onBack={() => goToStep("preview")}
                onSetFallbackAliasesEnabled={setFallbackAliasesEnabled}
                onUpdateTargetField={updateTargetField}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

async function uploadAndSuggest(
  companyId: string,
  file: File | null,
  t: Translator,
) {
  if (!file) {
    throw new CRMClientError(t("imports.errors.chooseFile"), 400);
  }
  return suggestImportFromCSVUpload(companyId, file);
}

async function suggestFromURL(
  companyId: string,
  fileURL: string,
  t: Translator,
) {
  if (fileURL.trim() === "") {
    throw new CRMClientError(t("imports.errors.enterUrl"), 400);
  }
  return suggestImportFromCSVURL(companyId, fileURL);
}

async function parseSelectedFile(file: File | null, t: Translator) {
  if (!file) {
    throw new CRMClientError(t("imports.errors.chooseFile"), 400);
  }
  return parseCSVFile(file);
}

async function parseSelectedURL(fileURL: string, t: Translator) {
  if (fileURL.trim() === "") {
    throw new CRMClientError(t("imports.errors.enterUrl"), 400);
  }

  try {
    return await parseCSVFromURL(fileURL);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("imports.errors.fetchUrlFailed");
    throw new CRMClientError(message, 400);
  }
}

async function importCustomers(
  companyId: string,
  rows: Record<string, string>[],
  onProgress?: (progress: ImportProgress) => void,
  t?: Translator,
) {
  const total = rows.length;

  for (const [index, row] of rows.entries()) {
    const currentLabel = describeImportRow(row, index + 1, t);
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
