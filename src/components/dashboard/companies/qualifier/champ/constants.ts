import type { DimensionMeta } from "./types";

export const MAX = 25;

export const DIMENSIONS: DimensionMeta[] = [
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

export const NEG_SIGNAL_LABELS: Record<string, { label: string; icon: string }> = {
  price_fishing: { label: "Fiyat Avcisi", icon: "M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.93-12A2 2 0 0012 3a2 2 0 00-1.82 1.04l-6.93 12A2 2 0 005.07 19z" },
  just_looking: { label: "Sadece Bakiyor", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  competitor: { label: "Rakip Firma", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  unresponsive: { label: "Yanit Vermiyor", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
};

export const SECTOR_LABELS: Record<string, { label: string; icon: string }> = {
  has_land: { label: "Arsa Mevcut", icon: "M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" },
  has_architect: { label: "Mimar Mevcut", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" },
  permit_status: { label: "Ruhsat", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  budget_source: { label: "Butce Kaynagi", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
};

/* ── Radar math ──────────────────────────────────────────────────────────── */

export const RADAR_SIZE = 260;
export const RADAR_CENTER = RADAR_SIZE / 2;
export const RADAR_RADIUS = 95;
export const ANGLES = [0, 90, 180, 270];

export function polarToCart(angle: number, value: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = (value / MAX) * RADAR_RADIUS;
  return [RADAR_CENTER + r * Math.cos(rad), RADAR_CENTER + r * Math.sin(rad)];
}

export function gridPath(level: number): string {
  return (
    ANGLES.map((a, i) => {
      const [x, y] = polarToCart(a, (level / 5) * MAX);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ") + "Z"
  );
}

/* ── Score utilities ─────────────────────────────────────────────────────── */

export function scoreToGrade(score: number, max: number): { letter: string; label: string } {
  const pct = (score / max) * 100;
  if (pct >= 92) return { letter: "A+", label: "Mukemmel" };
  if (pct >= 85) return { letter: "A", label: "Cok Iyi" };
  if (pct >= 78) return { letter: "B+", label: "Iyi" };
  if (pct >= 70) return { letter: "B", label: "Orta Ustu" };
  if (pct >= 55) return { letter: "C", label: "Orta" };
  return { letter: "D", label: "Dusuk" };
}

export function scoreToColor(score: number, max: number): string {
  const pct = Math.min(score / max, 1);
  // 4-stop gradient: red(0) → amber(0.33) → lime(0.66) → emerald(1)
  const stops: [number, number, number, number][] = [
    [0, 0, 78, 55],     // #ef4444 → hsl(0, 78%, 55%)
    [0.33, 38, 92, 50],  // #f59e0b → hsl(38, 92%, 50%)
    [0.66, 84, 81, 44],  // #84cc16 → hsl(84, 81%, 44%)
    [1, 160, 84, 39],    // #10b981 → hsl(160, 84%, 39%)
  ];

  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i][0] && pct <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper[0] - lower[0] || 1;
  const t = (pct - lower[0]) / range;
  const h = lower[1] + (upper[1] - lower[1]) * t;
  const s = lower[2] + (upper[2] - lower[2]) * t;
  const l = lower[3] + (upper[3] - lower[3]) * t;
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export function highestDimensionIndex(values: number[]): number {
  let maxIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[maxIdx]) maxIdx = i;
  }
  return maxIdx;
}

export function extractEvidence(text: string): { quotes: string[]; summary: string } {
  const quoteRegex = /[""\u201C](.*?)[""\u201D]/g;
  const quotes: string[] = [];
  let match;
  while ((match = quoteRegex.exec(text)) !== null) {
    if (match[1].trim().length > 3) quotes.push(match[1].trim());
  }
  const summary = text.replace(quoteRegex, "").replace(/\s+/g, " ").trim();
  return { quotes, summary };
}
