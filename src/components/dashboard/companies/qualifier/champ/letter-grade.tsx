"use client";

import { scoreToGrade } from "./constants";

export function LetterGrade({
  score,
  max,
  color,
  size = "md",
}: {
  score: number;
  max: number;
  color: string;
  size?: "sm" | "md";
}) {
  const { letter } = scoreToGrade(score, max);
  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span className={`relative inline-flex items-center justify-center font-black tracking-tight rounded-lg ${px}`}>
      {/* Glow layer */}
      <span
        className="absolute inset-0 rounded-lg blur-md opacity-30"
        style={{ backgroundColor: color }}
      />
      {/* Badge */}
      <span
        className="relative z-10 rounded-lg"
        style={{ color }}
      >
        {letter}
      </span>
    </span>
  );
}
