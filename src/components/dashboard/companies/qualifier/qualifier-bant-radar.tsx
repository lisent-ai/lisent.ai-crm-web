"use client";

import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   CHAMP Analysis — Premium Dashboard Component
   Pure SVG + CSS animations, no external chart library
   ═══════════════════════════════════════════════════════════════════════════ */

type ChampData = {
  challenges: number;
  authority: number;
  money: number;
  prioritization: number;
};

type Props = {
  champ: ChampData;
  /** Composite score from the lead (fit*0.30 + qualification*0.45 + engagement*0.15 + sector*0.10). Shown in lead list. */
  compositeScore?: number;
  notes?: {
    challenges_notes?: string;
    authority_notes?: string;
    money_notes?: string;
    prioritization_notes?: string;
  };
  holistic?: {
    holistic_score?: number;
    holistic_reasoning?: string;
    icp_fit_assessment?: string;
    negative_signals?: string[];
    negative_reasoning?: string;
    recommended_next_question?: string;
    missing_info?: string[];
    // Extended fields (backward-compatible)
    challenges_confidence?: number;
    authority_confidence?: number;
    money_confidence?: number;
    prioritization_confidence?: number;
    sector_qualifiers?: Record<string, unknown>;
    scoring_mode?: string;
  };
};

/* ── Constants ──────────────────────────────────────────────────────────── */

const MAX = 25;

const DIMENSIONS: {
  key: keyof ChampData;
  label: string;
  labelEn: string;
  color: string;
  colorLight: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  confKey: string;
  noteKey: string;
}[] = [
  {
    key: "challenges",
    label: "Ihtiyaclar",
    labelEn: "Challenges",
    color: "#7c3aed",
    colorLight: "#ede9fe",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6d28d9",
    icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z",
    confKey: "challenges_confidence",
    noteKey: "challenges_notes",
  },
  {
    key: "authority",
    label: "Yetki",
    labelEn: "Authority",
    color: "#0891b2",
    colorLight: "#cffafe",
    gradientFrom: "#06b6d4",
    gradientTo: "#0e7490",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    confKey: "authority_confidence",
    noteKey: "authority_notes",
  },
  {
    key: "money",
    label: "Butce",
    labelEn: "Money",
    color: "#f59e0b",
    colorLight: "#fef3c7",
    gradientFrom: "#fbbf24",
    gradientTo: "#d97706",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    confKey: "money_confidence",
    noteKey: "money_notes",
  },
  {
    key: "prioritization",
    label: "Oncelik",
    labelEn: "Prioritization",
    color: "#10b981",
    colorLight: "#d1fae5",
    gradientFrom: "#34d399",
    gradientTo: "#059669",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    confKey: "prioritization_confidence",
    noteKey: "prioritization_notes",
  },
];

const NEG_SIGNAL_LABELS: Record<string, { label: string; icon: string }> = {
  price_fishing: { label: "Fiyat Avcisi", icon: "M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.93-12A2 2 0 0012 3a2 2 0 00-1.82 1.04l-6.93 12A2 2 0 005.07 19z" },
  just_looking: { label: "Sadece Bakiyor", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  competitor: { label: "Rakip Firma", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  unresponsive: { label: "Yanit Vermiyor", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
};

const SECTOR_LABELS: Record<string, { label: string; icon: string }> = {
  has_land: { label: "Arsa Mevcut", icon: "M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" },
  has_architect: { label: "Mimar Mevcut", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" },
  permit_status: { label: "Ruhsat", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  budget_source: { label: "Butce Kaynagi", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
};

/* ── Radar math ─────────────────────────────────────────────────────────── */

const RADAR_SIZE = 260;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 95;
const ANGLES = [0, 90, 180, 270];

function polarToCart(angle: number, value: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = (value / MAX) * RADAR_RADIUS;
  return [RADAR_CENTER + r * Math.cos(rad), RADAR_CENTER + r * Math.sin(rad)];
}

function gridPath(level: number): string {
  return ANGLES.map((a, i) => {
    const [x, y] = polarToCart(a, (level / 5) * MAX);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + "Z";
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function ScoreRing({
  score,
  max,
  size,
  strokeWidth,
  color,
  bgColor = "#e2e8f0",
  delay = 0,
}: {
  score: number;
  max: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor?: string;
  delay?: number;
}) {
  const [animated, setAnimated] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / max, 1);
  const offset = circumference * (1 - (animated ? pct : 0));

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

function DimensionCard({
  dim,
  score,
  confidence,
  note,
  index,
}: {
  dim: (typeof DIMENSIONS)[number];
  score: number;
  confidence?: number;
  note?: string;
  index: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 transition-shadow hover:shadow-lg hover:shadow-slate-200/50"
      style={{
        animation: `fadeSlideUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${dim.gradientFrom}, ${dim.gradientTo})` }}
      />

      <div className="flex items-start gap-3">
        {/* Mini gauge */}
        <div className="relative shrink-0">
          <ScoreRing
            score={score}
            max={MAX}
            size={56}
            strokeWidth={5}
            color={dim.color}
            bgColor={dim.colorLight}
            delay={index * 120}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: dim.color }}>
              {score}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Label + icon */}
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={dim.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d={dim.icon} />
            </svg>
            <span className="text-xs font-semibold text-slate-700">{dim.label}</span>
            <span className="text-[10px] text-slate-400">/ {MAX}</span>
          </div>

          {/* Confidence */}
          {confidence != null && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${confidence * 100}%`,
                    backgroundColor: confidence >= 0.7 ? dim.color : "#94a3b8",
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                %{Math.round(confidence * 100)}
              </span>
            </div>
          )}

          {/* Note */}
          {note && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
              {note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RadarChart({ values }: { values: number[] }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const animatedValues = animated ? values : [0, 0, 0, 0];

  const dataPath =
    animatedValues
      .map((v, i) => {
        const [x, y] = polarToCart(ANGLES[i], v);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ") + "Z";

  return (
    <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="w-full h-full">
      <defs>
        {/* Gradient fill for data area */}
        <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.08" />
        </radialGradient>
        {/* Glow effect for data points */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Subtle shadow for grid */}
        <filter id="gridShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* Grid levels */}
      {[1, 2, 3, 4, 5].map((level) => (
        <path
          key={level}
          d={gridPath(level)}
          fill="none"
          stroke={level === 5 ? "#cbd5e1" : "#e2e8f0"}
          strokeWidth={level === 5 ? "0.8" : "0.4"}
          opacity={level === 5 ? 0.8 : 0.5}
        />
      ))}

      {/* Axes */}
      {ANGLES.map((a, i) => {
        const [x, y] = polarToCart(a, MAX);
        return (
          <line
            key={i}
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={x}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            opacity="0.6"
          />
        );
      })}

      {/* Data area with gradient */}
      <path
        d={dataPath}
        fill="url(#radarGradient)"
        stroke="#7c3aed"
        strokeWidth="2.5"
        strokeLinejoin="round"
        style={{ transition: "d 1s cubic-bezier(0.4,0,0.2,1)" }}
      />

      {/* Data points with glow */}
      {animatedValues.map((v, i) => {
        const [x, y] = polarToCart(ANGLES[i], v);
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="5"
              fill={DIMENSIONS[i].color}
              filter="url(#glow)"
              style={{ transition: "cx 1s cubic-bezier(0.4,0,0.2,1), cy 1s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx={x}
              cy={y}
              r="2.5"
              fill="white"
              style={{ transition: "cx 1s cubic-bezier(0.4,0,0.2,1), cy 1s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </g>
        );
      })}

      {/* Labels */}
      {DIMENSIONS.map((dim, i) => {
        const offset = 16;
        const [x, y] = polarToCart(ANGLES[i], MAX + offset);
        return (
          <g key={i}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              className="fill-slate-600"
            >
              {dim.label}
            </text>
            <text
              x={x}
              y={y + 13}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="500"
              fill={dim.color}
            >
              {values[i]}/{MAX}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main Component ────────────────────────────────────────────────────── */

export function QualifierBantRadar({ champ, compositeScore, notes, holistic }: Readonly<Props>) {
  const values = DIMENSIONS.map((d) => champ[d.key]);
  const total = values.reduce((a, b) => a + b, 0);
  const holisticScore = holistic?.holistic_score;

  const notesList = notes
    ? [notes.challenges_notes, notes.authority_notes, notes.money_notes, notes.prioritization_notes]
    : [];

  const confidences = holistic
    ? [
        holistic.challenges_confidence,
        holistic.authority_confidence,
        holistic.money_confidence,
        holistic.prioritization_confidence,
      ]
    : [];

  const hasHolistic = holistic && (holistic.holistic_reasoning || holistic.icp_fit_assessment);
  const hasNegatives = holistic?.negative_signals && holistic.negative_signals.length > 0;
  const hasNextQuestion = holistic?.recommended_next_question;
  const hasMissing = holistic?.missing_info && holistic.missing_info.length > 0;
  const hasSectorQualifiers =
    holistic?.sector_qualifiers && Object.keys(holistic.sector_qualifiers).length > 0;

  function scoreColor(score: number): string {
    if (score >= 80) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#94a3b8";
  }

  // 3 distinct scores to display
  const scores: { value: number; max: number; label: string; sublabel: string; color: string; size: number; strokeWidth: number }[] = [];

  // 1. Composite score (from lead list — the "final" weighted score)
  if (compositeScore != null) {
    scores.push({
      value: compositeScore,
      max: 100,
      label: "Final Skor",
      sublabel: "Agirlikli kompozit skor (lead listesindeki deger)",
      color: scoreColor(compositeScore),
      size: 120,
      strokeWidth: 10,
    });
  }

  // 2. Holistic score (LLM judge's overall assessment)
  if (holisticScore != null) {
    scores.push({
      value: holisticScore,
      max: 100,
      label: "AI Skoru",
      sublabel: "LLM'in genel kalifikasyon degerlendirmesi",
      color: "#7c3aed",
      size: compositeScore != null ? 96 : 120,
      strokeWidth: compositeScore != null ? 8 : 10,
    });
  }

  // 3. CHAMP total (sum of 4 dimensions)
  scores.push({
    value: total,
    max: 100,
    label: "CHAMP Toplam",
    sublabel: "4 boyutun toplami (Ihtiyac + Yetki + Butce + Oncelik)",
    color: "#0891b2",
    size: scores.length >= 2 ? 96 : scores.length === 1 ? 96 : 120,
    strokeWidth: scores.length >= 2 ? 8 : scores.length === 1 ? 8 : 10,
  });

  return (
    <div className="space-y-4">
      {/* ── Keyframe styles ──────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* ── Hero: Score Rings + Radar ────────────────────────────────── */}
      <div
        className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-sm"
        style={{ animation: "fadeSlideUp 0.4s ease-out both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">CHAMP Analizi</p>
              <p className="text-[10px] text-slate-400">
                {holistic?.scoring_mode === "llm_judge"
                  ? "AI Degerlendirmesi"
                  : holistic?.scoring_mode === "hybrid"
                    ? "Hibrit Analiz"
                    : "CHAMP Cikarimi"}
              </p>
            </div>
          </div>
        </div>

        {/* Score rings + radar side by side */}
        <div className="flex items-start gap-6">
          {/* Score rings column */}
          <div className="shrink-0 flex flex-col items-center gap-4">
            {scores.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center" style={{ animation: `fadeSlideUp 0.5s ease-out ${i * 0.15}s both` }}>
                <div className="relative">
                  <ScoreRing
                    score={s.value}
                    max={s.max}
                    size={s.size}
                    strokeWidth={s.strokeWidth}
                    color={s.color}
                    bgColor="#f1f5f9"
                    delay={i * 150}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="font-black tabular-nums"
                      style={{ color: s.color, fontSize: s.size >= 120 ? "1.875rem" : "1.25rem" }}
                    >
                      {s.value}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400">/ {s.max}</span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] font-bold text-slate-600 text-center">{s.label}</p>
                <p className="text-[9px] text-slate-400 text-center max-w-[140px] leading-tight">{s.sublabel}</p>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          <div className="flex-1 max-w-[280px] mx-auto">
            <RadarChart values={values} />
          </div>
        </div>
      </div>

      {/* ── Dimension Cards (2x2 grid) ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {DIMENSIONS.map((dim, i) => (
          <DimensionCard
            key={dim.key}
            dim={dim}
            score={values[i]}
            confidence={confidences[i]}
            note={notesList[i]}
            index={i}
          />
        ))}
      </div>

      {/* ── Holistic Assessment ──────────────────────────────────────── */}
      {hasHolistic && (
        <div
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-violet-50/50 to-white p-4 space-y-3"
          style={{ animation: "fadeSlideUp 0.5s ease-out 0.3s both" }}
        >
          {holistic!.holistic_reasoning && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-xs font-bold text-slate-700">Ozet Degerlendirme</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 bg-white/80 rounded-xl px-3.5 py-2.5 border border-slate-100">
                {holistic!.holistic_reasoning}
              </p>
            </div>
          )}

          {holistic!.icp_fit_assessment && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xs font-bold text-slate-700">Ideal Musteri Uyumu</p>
              </div>
              <p className="text-xs leading-relaxed text-violet-700 bg-violet-50 rounded-xl px-3.5 py-2.5 border border-violet-100">
                {holistic!.icp_fit_assessment}
              </p>
            </div>
          )}

          {/* Sector Qualifiers */}
          {hasSectorQualifiers && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(holistic!.sector_qualifiers!).map(([key, value]) => {
                const meta = SECTOR_LABELS[key];
                if (!meta || !value) return null;
                const displayValue =
                  typeof value === "boolean"
                    ? null
                    : typeof value === "number"
                      ? String(value)
                      : String(value);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={meta.icon} />
                    </svg>
                    {meta.label}
                    {displayValue && (
                      <span className="text-emerald-500 font-normal">
                        ({displayValue})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Negative Signals ─────────────────────────────────────────── */}
      {hasNegatives && (
        <div
          className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 to-white p-4"
          style={{ animation: "fadeSlideUp 0.5s ease-out 0.4s both" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.93-12A2 2 0 0012 3a2 2 0 00-1.82 1.04l-6.93 12A2 2 0 005.07 19z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-rose-700">Uyari Sinyalleri</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {holistic!.negative_signals!.map((sig) => {
              const meta = NEG_SIGNAL_LABELS[sig];
              return (
                <span
                  key={sig}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700"
                >
                  {meta && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={meta.icon} />
                    </svg>
                  )}
                  {meta?.label || sig}
                </span>
              );
            })}
          </div>
          {holistic!.negative_reasoning && (
            <p className="mt-2 text-[11px] leading-relaxed text-rose-600 bg-white/60 rounded-lg px-3 py-2 border border-rose-100">
              {holistic!.negative_reasoning}
            </p>
          )}
        </div>
      )}

      {/* ── Missing Info + Next Question ─────────────────────────────── */}
      {(hasMissing || hasNextQuestion) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Missing info */}
          {hasMissing && (
            <div
              className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white p-4"
              style={{ animation: "fadeSlideUp 0.5s ease-out 0.5s both" }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-amber-700">Eksik Bilgiler</p>
              </div>
              <ul className="space-y-1.5">
                {holistic!.missing_info!.map((info, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-amber-800">
                    <div className="mt-0.5 w-4 h-4 rounded border border-amber-300 bg-amber-50 shrink-0 flex items-center justify-center">
                      <span className="text-amber-400 text-[8px] font-bold">?</span>
                    </div>
                    <span className="leading-relaxed">{info}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended next question */}
          {hasNextQuestion && (
            <div
              className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/40 to-white p-4"
              style={{ animation: "fadeSlideUp 0.5s ease-out 0.55s both" }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-cyan-700">Onerilen Soru</p>
              </div>
              <div className="relative bg-white/80 rounded-xl px-4 py-3 border border-cyan-100">
                <div className="absolute -top-1 left-4 w-5 h-5 flex items-center justify-center text-cyan-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-cyan-800 italic pl-2">
                  {holistic!.recommended_next_question}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
