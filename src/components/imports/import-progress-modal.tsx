"use client";

import { useTranslations } from "next-intl";

import { type ImportProgress } from "./import-types";

export function ImportProgressModal({
  progress,
}: Readonly<{
  progress: ImportProgress;
}>) {
  const t = useTranslations();
  const percent =
    progress.total === 0 ? 0 : (progress.completed / progress.total) * 100;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
        <div className="flex items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              {t("imports.progress.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t("imports.progress.title")}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          {t("imports.progress.description")}
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4 text-sm font-medium text-slate-700">
            <span>
              {t("imports.progress.completedRatio", {
                completed: progress.completed,
                total: progress.total,
              })}
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] transition-[width] duration-300"
              style={{ width: `${Math.max(8, percent)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {t("imports.progress.currentRow")}: {progress.currentLabel || t("imports.progress.preparing")}
          </p>
        </div>
      </div>
    </div>
  );
}
