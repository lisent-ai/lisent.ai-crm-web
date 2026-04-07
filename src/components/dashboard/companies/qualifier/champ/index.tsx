"use client";

import type { Props } from "./types";
import { DIMENSIONS, highestDimensionIndex } from "./constants";
import { ScoreHeroCard } from "./score-hero-card";
import { DimensionCard } from "./dimension-card";
import { HolisticPanel } from "./holistic-panel";
import { NegativeSignalsCard } from "./negative-signals-card";
import { MissingInfoCard } from "./missing-info-card";
import { NextQuestionCard } from "./next-question-card";

function scoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#94a3b8";
}

export function QualifierBantRadar({ champ, compositeScore, notes, holistic }: Readonly<Props>) {
  const values = DIMENSIONS.map((d) => champ[d.key]);
  const total = values.reduce((a, b) => a + b, 0);
  const holisticScore = holistic?.holistic_score;
  const highestIdx = highestDimensionIndex(values);

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
  const hasNextQuestion = !!holistic?.recommended_next_question;
  const hasMissing = holistic?.missing_info && holistic.missing_info.length > 0;

  // Build score entries
  const scores: { value: number; max: number; label: string; sublabel: string; color: string; size: number; strokeWidth: number }[] = [];

  if (compositeScore != null) {
    scores.push({
      value: compositeScore,
      max: 100,
      label: "Final Skor",
      sublabel: "Agirlikli kompozit skor",
      color: scoreColor(compositeScore),
      size: 110,
      strokeWidth: 9,
    });
  }

  if (holisticScore != null) {
    scores.push({
      value: holisticScore,
      max: 100,
      label: "AI Skoru",
      sublabel: "LLM kalifikasyon degerlendirmesi",
      color: "#7c3aed",
      size: compositeScore != null ? 88 : 110,
      strokeWidth: compositeScore != null ? 7 : 9,
    });
  }

  scores.push({
    value: total,
    max: 100,
    label: "CHAMP Toplam",
    sublabel: "4 boyut toplami",
    color: "#0891b2",
    size: scores.length >= 2 ? 88 : scores.length === 1 ? 88 : 110,
    strokeWidth: scores.length >= 2 ? 7 : scores.length === 1 ? 7 : 9,
  });

  return (
    <div className="space-y-3">
      {/* ── Bento Grid ──────────────────────────────────────────────────── */}
      <div className={`grid gap-3 ${hasNegatives ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-4"}`}>
        {/* Hero Card: scores + radar */}
        <div className={hasNegatives ? "col-span-2 lg:col-span-3 lg:row-span-2" : "col-span-2 lg:col-span-4"}>
          <ScoreHeroCard
            scores={scores}
            values={values}
            scoringMode={holistic?.scoring_mode}
          />
        </div>

        {/* Negative signals (right column on desktop) */}
        {hasNegatives && (
          <div className="col-span-2 lg:col-span-1 lg:row-span-2">
            <NegativeSignalsCard
              signals={holistic!.negative_signals!}
              reasoning={holistic!.negative_reasoning}
            />
          </div>
        )}

        {/* Dimension Cards (2x2 grid) */}
        {DIMENSIONS.map((dim, i) => (
          <div key={dim.key} className="col-span-1 lg:col-span-2">
            <DimensionCard
              dim={dim}
              score={values[i]}
              confidence={confidences[i]}
              note={notesList[i]}
              index={i}
              isHighest={i === highestIdx}
            />
          </div>
        ))}

        {/* Holistic Assessment (full width) */}
        {hasHolistic && (
          <div className="col-span-2 lg:col-span-4">
            <HolisticPanel
              holisticReasoning={holistic!.holistic_reasoning}
              icpFitAssessment={holistic!.icp_fit_assessment}
              sectorQualifiers={holistic!.sector_qualifiers}
            />
          </div>
        )}

        {/* Missing Info + Next Question */}
        {(hasMissing || hasNextQuestion) && (
          <>
            {hasMissing && (
              <div className="col-span-2 lg:col-span-2">
                <MissingInfoCard items={holistic!.missing_info!} />
              </div>
            )}
            {hasNextQuestion && (
              <div className={`col-span-2 ${hasMissing ? "lg:col-span-2" : "lg:col-span-4"}`}>
                <NextQuestionCard question={holistic!.recommended_next_question!} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
