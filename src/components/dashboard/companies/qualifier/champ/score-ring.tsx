"use client";

import { useEffect, useState } from "react";
import { useAnimatedValue } from "./hooks/use-animated-value";
import { scoreToColor } from "./constants";

export function ScoreRing({
  score,
  max,
  size,
  strokeWidth,
  color,
  useGradientColor = false,
  bgColor = "#e2e8f0",
  delay = 0,
  children,
}: {
  score: number;
  max: number;
  size: number;
  strokeWidth: number;
  color: string;
  useGradientColor?: boolean;
  bgColor?: string;
  delay?: number;
  children?: React.ReactNode;
}) {
  const [animated, setAnimated] = useState(false);
  const animatedScore = useAnimatedValue(score, { delay: delay + 100 });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / max, 1);
  const offset = circumference * (1 - (animated ? pct : 0));
  const gradientId = `ring-grad-${size}-${score}`;
  const strokeColor = useGradientColor ? scoreToColor(score, max) : color;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="1" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span
              className="font-black tabular-nums leading-none"
              style={{ color: strokeColor, fontSize: size >= 110 ? "1.75rem" : size >= 80 ? "1.125rem" : "0.875rem" }}
            >
              {animatedScore}
            </span>
            <span className="text-[9px] font-medium text-slate-400 mt-0.5">/ {max}</span>
          </>
        )}
      </div>
    </div>
  );
}
