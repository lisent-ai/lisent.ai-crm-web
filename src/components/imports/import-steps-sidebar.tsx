"use client";

import { useTranslations } from "next-intl";

import { steps, stepSequence } from "./import-config";
import { Stat } from "./import-ui";
import { type StepId } from "./import-types";

export function ImportStepsSidebar({
  activeStep,
  maxUnlockedStepIndex,
  headersCount,
  mappedCount,
  rowsLoaded,
  onGoToStep,
}: Readonly<{
  activeStep: StepId;
  maxUnlockedStepIndex: number;
  headersCount: number;
  mappedCount: number;
  rowsLoaded: number;
  onGoToStep: (stepId: StepId) => void;
}>) {
  const t = useTranslations();
  const activeStepMeta = steps.find((step) => step.id === activeStep) ?? steps[0];

  return (
    <aside className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7,_#f8fafc)] p-4 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">{t("imports.sidebar.title")}</h2>
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
              onClick={() => onGoToStep(step.id)}
              type="button"
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.24em] ${
                  active ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {t("imports.sidebar.stepNumber", { number: step.stepNumber })}
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">
                {t(step.labelKey as never)}
              </h3>
              <p
                className={`mt-3 text-sm leading-6 ${
                  active ? "text-slate-200" : unlocked ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {t(step.summaryKey as never)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {t("imports.sidebar.progress")}
        </p>
        <div className="mt-3 grid gap-3">
          <Stat label={t("imports.sidebar.headers")} value={String(headersCount)} />
          <Stat label={t("imports.sidebar.mappedFields")} value={String(mappedCount)} />
          <Stat label={t("imports.sidebar.rowsLoaded")} value={String(rowsLoaded)} />
        </div>
      </div>
    </aside>
  );
}
