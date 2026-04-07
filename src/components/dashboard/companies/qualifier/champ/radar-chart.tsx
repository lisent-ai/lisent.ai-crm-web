"use client";

import { useEffect, useState } from "react";
import { DIMENSIONS, MAX, RADAR_SIZE, RADAR_CENTER, ANGLES, polarToCart, gridPath } from "./constants";

export function RadarChart({ values, dark = false }: { values: number[]; dark?: boolean }) {
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
        <radialGradient id="champ-radar-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.06" />
        </radialGradient>
        <filter id="champ-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid levels */}
      {[1, 2, 3, 4, 5].map((level) => (
        <path
          key={level}
          d={gridPath(level)}
          fill="none"
          stroke={dark ? (level === 5 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)") : (level === 5 ? "#cbd5e1" : "#e2e8f0")}
          strokeWidth={level === 5 ? "0.8" : "0.4"}
          opacity={1}
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
            stroke={dark ? "rgba(255,255,255,0.1)" : DIMENSIONS[i].color}
            strokeWidth="0.5"
            opacity={dark ? 1 : 0.2}
          />
        );
      })}

      {/* Data area */}
      <path
        d={dataPath}
        fill="url(#champ-radar-fill)"
        stroke={dark ? "#a78bfa" : "#7c3aed"}
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transition: "d 1s cubic-bezier(0.4,0,0.2,1)" }}
      />

      {/* Data points — static, per-dimension color */}
      {animatedValues.map((v, i) => {
        const [x, y] = polarToCart(ANGLES[i], v);
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="5"
              fill={DIMENSIONS[i].color}
              filter="url(#champ-glow)"
              style={{ transition: "cx 1s cubic-bezier(0.4,0,0.2,1), cy 1s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx={x}
              cy={y}
              r="2"
              fill="white"
              style={{ transition: "cx 1s cubic-bezier(0.4,0,0.2,1), cy 1s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </g>
        );
      })}

      {/* Labels */}
      {DIMENSIONS.map((dim, i) => {
        const offset = 18;
        const [x, y] = polarToCart(ANGLES[i], MAX + offset);
        return (
          <g key={i}>
            <text
              x={x}
              y={y - 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fontWeight="700"
              fill={dark ? "rgba(255,255,255,0.7)" : "#475569"}
            >
              {dim.label}
            </text>
            <text
              x={x}
              y={y + 12}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9.5"
              fontWeight="600"
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
