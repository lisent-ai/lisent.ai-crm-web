"use client";

import { NEG_SIGNAL_LABELS } from "./constants";

export function NegativeSignalsCard({
  signals,
  reasoning,
}: {
  signals: string[];
  reasoning?: string;
}) {
  if (signals.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50/40 p-4 border border-rose-200/60 h-full"
      style={{ animation: "slideUp 0.5s ease-out 0.2s both" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.93-12A2 2 0 0012 3a2 2 0 00-1.82 1.04l-6.93 12A2 2 0 005.07 19z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold text-rose-800">Uyari Sinyalleri</p>
          <p className="text-[10px] text-rose-500">{signals.length} sinyal tespit edildi</p>
        </div>
      </div>

      <div className="space-y-2">
        {signals.map((sig) => {
          const meta = NEG_SIGNAL_LABELS[sig];
          return (
            <div
              key={sig}
              className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 border border-rose-100"
            >
              {meta && (
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-100 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={meta.icon} />
                  </svg>
                </div>
              )}
              <span className="text-[11px] font-semibold text-rose-700">{meta?.label || sig}</span>
            </div>
          );
        })}
      </div>

      {reasoning && (
        <div className="mt-3 bg-white/60 rounded-xl px-3 py-2.5 border border-rose-100/60">
          <p className="text-[11px] leading-relaxed text-rose-600">{reasoning}</p>
        </div>
      )}
    </div>
  );
}
