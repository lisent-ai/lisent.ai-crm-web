"use client";

import { useAnimatedValue } from "./hooks/use-animated-value";
import { DIMENSIONS, MAX, scoreToGrade } from "./constants";
import { ScoreRing } from "./score-ring";
import { RadarChart } from "./radar-chart";

type ScoreEntry = {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  color: string;
  size: number;
  strokeWidth: number;
};

export function ScoreHeroCard({
  scores,
  values,
  scoringMode,
}: {
  scores: ScoreEntry[];
  values: number[];
  scoringMode?: string;
}) {
  const modeLabel =
    scoringMode === "llm_judge"
      ? "AI Degerlendirmesi"
      : scoringMode === "hybrid"
        ? "Hibrit Analiz"
        : "CHAMP Cikarimi";

  // Primary score is the first one (Final Skor or CHAMP total)
  const primary = scores[0];
  const secondary = scores.slice(1);
  const primaryGrade = scoreToGrade(primary.value, primary.max);

  return (
    <div
      className="rounded-2xl relative overflow-hidden"
      style={{
        animation: "slideUp 0.5s ease-out both",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #3b0764 100%)",
      }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative z-10 p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white/90">CHAMP Analizi</p>
              <p className="text-[10px] text-violet-300/70 font-medium">{modeLabel}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-violet-200 ring-1 ring-inset ring-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {scoringMode === "llm_judge" ? "AI Judge" : scoringMode === "hybrid" ? "Hybrid" : "CHAMP"}
          </span>
        </div>

        {/* Main content: Big score + radar */}
        <div className="flex items-center gap-6">
          {/* Left: Primary score large */}
          <div className="shrink-0 flex flex-col items-center">
            <ScoreRing
              score={primary.value}
              max={primary.max}
              size={130}
              strokeWidth={10}
              color={primary.color}
              bgColor="rgba(255,255,255,0.08)"
              delay={0}
            >
              <span className="text-3xl font-black text-white tabular-nums">
                <AnimatedNumber value={primary.value} />
              </span>
              <span className="text-[10px] font-medium text-violet-300/60">/ {primary.max}</span>
            </ScoreRing>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold text-white/80">{primary.label}</span>
              <span
                className="text-[11px] font-black px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${primary.color}30`, color: primary.color }}
              >
                {primaryGrade.letter}
              </span>
            </div>
            <p className="text-[9px] text-violet-300/50 mt-0.5">{primary.sublabel}</p>

            {/* Secondary scores inline */}
            {secondary.length > 0 && (
              <div className="flex items-center gap-4 mt-4">
                {secondary.map((s, i) => (
                  <div key={s.label} className="flex flex-col items-center">
                    <ScoreRing
                      score={s.value}
                      max={s.max}
                      size={56}
                      strokeWidth={4}
                      color={s.color}
                      bgColor="rgba(255,255,255,0.06)"
                      delay={200 + i * 150}
                    />
                    <span className="text-[9px] font-semibold text-violet-300/60 mt-1 text-center max-w-[60px] leading-tight">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Radar chart */}
          <div className="flex-1 max-w-[260px] mx-auto">
            <RadarChart values={values} dark />
          </div>
        </div>

        {/* Bottom: Dimension summary bars */}
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5">
          {DIMENSIONS.map((dim, i) => {
            const pct = (values[i] / MAX) * 100;
            return (
              <div key={dim.key} className="flex items-center gap-2.5">
                <span className="text-[10px] font-semibold text-violet-200/70 w-[52px] shrink-0 truncate">{dim.label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bar-animate"
                    style={{ width: `${pct}%`, backgroundColor: dim.color, opacity: 0.85 }}
                  />
                </div>
                <span className="text-[10px] font-bold text-white/70 tabular-nums w-[28px] text-right">{values[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const animated = useAnimatedValue(value, { delay: 100 });
  return <>{animated}</>;
}
