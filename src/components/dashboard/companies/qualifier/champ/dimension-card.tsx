"use client";

import type { DimensionMeta } from "./types";
import { MAX, extractEvidence, scoreToGrade } from "./constants";
import { useAnimatedValue } from "./hooks/use-animated-value";
import { AnimatedBorder } from "./animated-border";

export function DimensionCard({
  dim,
  score,
  confidence,
  note,
  index,
  isHighest,
}: {
  dim: DimensionMeta;
  score: number;
  confidence?: number;
  note?: string;
  index: number;
  isHighest: boolean;
}) {
  const { quotes, summary } = note ? extractEvidence(note) : { quotes: [], summary: "" };
  const animatedScore = useAnimatedValue(score, { delay: 300 + index * 100 });
  const grade = scoreToGrade(score, MAX);
  const pct = (score / MAX) * 100;

  return (
    <AnimatedBorder active={isHighest} color={dim.color}>
      <div
        className="relative overflow-hidden rounded-2xl bg-white p-4 border border-slate-100 transition-shadow hover:shadow-lg hover:shadow-slate-200/40"
        style={{ animation: `slideUp 0.4s ease-out ${0.15 + index * 0.06}s both` }}
      >
        {/* Left color stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: `linear-gradient(180deg, ${dim.gradientFrom}, ${dim.gradientTo})` }}
        />

        {/* Header: icon + label + score + grade */}
        <div className="flex items-center gap-3 pl-2">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ backgroundColor: `${dim.color}12` }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={dim.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={dim.icon} />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-800">{dim.label}</span>
              <span className="text-[10px] text-slate-400">{dim.labelEn}</span>
            </div>
          </div>

          {/* Score big + grade */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-black tabular-nums leading-none" style={{ color: dim.color }}>
                {animatedScore}
              </span>
              <span className="text-[10px] text-slate-400 ml-0.5">/{MAX}</span>
            </div>
            <span
              className="text-xs font-black px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${dim.color}15`, color: dim.color }}
            >
              {grade.letter}
            </span>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 pl-2">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bar-animate"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${dim.gradientFrom}, ${dim.gradientTo})` }}
            />
          </div>
        </div>

        {/* Confidence indicator */}
        {confidence != null && (
          <div className="mt-2 pl-2 flex items-center gap-2">
            <div className="flex gap-0.5">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold) => (
                <div
                  key={threshold}
                  className="w-3 h-1.5 rounded-sm"
                  style={{
                    backgroundColor: confidence >= threshold ? dim.color : "#e2e8f0",
                    opacity: confidence >= threshold ? 0.7 : 0.4,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium text-slate-400 tabular-nums">
              %{Math.round(confidence * 100)} guven
            </span>
          </div>
        )}

        {/* Evidence quotes */}
        {quotes.length > 0 && (
          <div className="mt-3 pl-2 space-y-1.5">
            {quotes.slice(0, 2).map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5"
                style={{ backgroundColor: `${dim.color}08`, color: dim.color }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 mt-0.5 opacity-40">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <span className="line-clamp-2">{q}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary note */}
        {summary && (
          <p className="mt-2 pl-2 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
            {summary}
          </p>
        )}
        {!summary && note && quotes.length === 0 && (
          <p className="mt-2.5 pl-2 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
            {note}
          </p>
        )}
      </div>
    </AnimatedBorder>
  );
}
