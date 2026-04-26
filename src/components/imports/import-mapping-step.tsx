"use client";

import { useTranslations } from "next-intl";

import { type AvailableField, type MappingRow } from "./import-types";

export function ImportMappingStep({
  fallbackAliasesEnabled,
  mappingRows,
  availableFields,
  approving,
  onSetFallbackAliasesEnabled,
  onUpdateTargetField,
  onApprove,
  onBack,
}: Readonly<{
  fallbackAliasesEnabled: boolean;
  mappingRows: MappingRow[];
  availableFields: AvailableField[];
  approving: boolean;
  onSetFallbackAliasesEnabled: (value: boolean) => void;
  onUpdateTargetField: (header: string, targetField: string) => void;
  onApprove: () => void;
  onBack: () => void;
}>) {
  const t = useTranslations();
  return (
    <div>
      <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800">
        <input
          checked={fallbackAliasesEnabled}
          className="size-4 accent-slate-900"
          onChange={(event) => onSetFallbackAliasesEnabled(event.target.checked)}
          type="checkbox"
        />
        {t("imports.mapping.enableFallback")}
      </label>

      <div className="mt-6 grid gap-4">
        {mappingRows.map((row) => (
          <div
            className="grid gap-4 rounded-[1.4rem] border border-slate-200 bg-white p-5 md:grid-cols-[0.95fr_1fr_1.15fr]"
            key={row.header}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {t("imports.mapping.sourceHeader")}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-950">
                {row.header}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("imports.mapping.sample")}: {row.sampleValue || "-"}
              </p>
            </div>

            <div className="relative z-20">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {t("imports.mapping.targetField")}
              </p>
              <select
                className="relative mt-2 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-slate-900"
                onChange={(event) =>
                  onUpdateTargetField(row.header, event.target.value)
                }
                value={row.targetField}
              >
                <option className="bg-white text-slate-900" value="">
                  {t("imports.mapping.leaveUnmapped")}
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
                {(() => {
                  const field = availableFields.find((f) => f.name === row.targetField);
                  if (!field) return null;
                  return field.descriptionKey ? t(field.descriptionKey as never) : field.description;
                })()}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {t("imports.mapping.suggestionNote")}
              </p>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {row.reason}
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                  {t("imports.mapping.confidence")} {Math.round(row.confidence * 100)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-white p-5">
        <p className="text-lg font-semibold text-slate-950">{t("imports.mapping.approvalOutcome")}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {t("imports.mapping.approvalDescription")}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={approving}
            onClick={onApprove}
            type="button"
          >
            {approving ? t("imports.mapping.importing") : t("imports.mapping.approveAndImport")}
          </button>
          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            onClick={onBack}
            type="button"
          >
            {t("imports.mapping.backToPreview")}
          </button>
        </div>
      </div>
    </div>
  );
}
