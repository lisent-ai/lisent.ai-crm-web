export type ChampData = {
  challenges: number;
  authority: number;
  money: number;
  prioritization: number;
};

export type Props = {
  champ: ChampData;
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
    challenges_confidence?: number;
    authority_confidence?: number;
    money_confidence?: number;
    prioritization_confidence?: number;
    sector_qualifiers?: Record<string, unknown>;
    scoring_mode?: string;
  };
};

export type DimensionMeta = {
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
};
