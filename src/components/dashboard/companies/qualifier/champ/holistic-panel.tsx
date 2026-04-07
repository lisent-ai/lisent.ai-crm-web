"use client";

import { useTypewriter } from "./hooks/use-typewriter";
import { SECTOR_LABELS } from "./constants";

export function HolisticPanel({
  holisticReasoning,
  icpFitAssessment,
  sectorQualifiers,
}: {
  holisticReasoning?: string;
  icpFitAssessment?: string;
  sectorQualifiers?: Record<string, unknown>;
}) {
  const { displayed, isComplete } = useTypewriter(holisticReasoning ?? "", { speed: 12, delay: 800 });
  const hasSectors = sectorQualifiers && Object.keys(sectorQualifiers).length > 0;

  if (!holisticReasoning && !icpFitAssessment) return null;

  return (
    <div
      className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/40 p-5 space-y-4"
      style={{ animation: "slideUp 0.5s ease-out 0.3s both" }}
    >
      {/* Holistic Reasoning with typewriter */}
      {holisticReasoning && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Ozet Degerlendirme</p>
              <p className="text-[10px] text-slate-400">AI tarafindan olusturuldu</p>
            </div>
            {!isComplete && (
              <span className="flex items-center gap-1 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-[typingDot_1.4s_ease-in-out_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-[typingDot_1.4s_ease-in-out_0.2s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-[typingDot_1.4s_ease-in-out_0.4s_infinite]" />
              </span>
            )}
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm">
            <p className="text-[13px] leading-relaxed text-slate-600 min-h-[2em]">
              {displayed}
              {!isComplete && <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-text-bottom" />}
            </p>
          </div>
        </div>
      )}

      {/* ICP Fit Assessment */}
      {icpFitAssessment && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Ideal Musteri Uyumu</p>
              <p className="text-[10px] text-slate-400">ICP fit analizi</p>
            </div>
          </div>
          <div className="bg-indigo-50/60 rounded-xl px-4 py-3 border border-indigo-100/60">
            <p className="text-[13px] leading-relaxed text-indigo-800">
              {icpFitAssessment}
            </p>
          </div>
        </div>
      )}

      {/* Sector Qualifiers */}
      {hasSectors && (
        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(sectorQualifiers!).map(([key, value]) => {
            const meta = SECTOR_LABELS[key];
            if (!meta || !value) return null;
            const displayValue = typeof value === "boolean" ? null : String(value);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={meta.icon} />
                </svg>
                {meta.label}
                {displayValue && (
                  <span className="text-emerald-500 font-normal">({displayValue})</span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
