export type MappingRow = {
  header: string;
  sampleValue: string;
  targetField: string;
  confidence: number;
  reason: string;
};

export type StepId = "source" | "preview" | "mapping";

export type ImportProgress = {
  completed: number;
  total: number;
  currentLabel: string;
};

export type AvailableField = {
  name: string;
  description: string;
  descriptionKey?: string;
};

export type StepMeta = {
  id: StepId;
  stepNumber: string;
  label: string;
  title: string;
  summary: string;
  labelKey: string;
  titleKey: string;
  summaryKey: string;
};
