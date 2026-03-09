import { type AvailableField, type MappingRow } from "./import-types";

export function describeImportRow(
  row: Record<string, string>,
  rowNumber: number,
) {
  const keys = ["name", "full_name", "first_name", "email", "phone"];
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }

  for (const value of Object.values(row)) {
    if (value.trim() !== "") {
      return value.trim();
    }
  }

  return `Row ${rowNumber}`;
}

export function buildMappingRows(
  headers: string[],
  sampleRows: Record<string, unknown>[],
  suggestions: Array<{
    target_field: string;
    source_headers: string[];
    confidence: number;
    reason: string;
  }>,
  availableFields: AvailableField[],
): MappingRow[] {
  return headers.map((header) => {
    const suggestion = suggestions.find((item) =>
      item.source_headers.includes(header),
    );
    const fallbackTarget = suggestion
      ? ""
      : inferTargetField(header, availableFields);

    return {
      header,
      sampleValue: sampleValueForHeader(sampleRows, header),
      targetField: suggestion?.target_field ?? fallbackTarget,
      confidence: suggestion?.confidence ?? (fallbackTarget ? 0.64 : 0),
      reason:
        suggestion?.reason ??
        (fallbackTarget
          ? "Mapped automatically from the header name."
          : "No strong suggestion from AI."),
    };
  });
}

export function buildMappingByField(rows: MappingRow[]) {
  const out: Record<string, string[]> = {};

  for (const row of rows) {
    const target = row.targetField.trim();
    if (target === "") {
      continue;
    }
    if (!out[target]) {
      out[target] = [];
    }
    out[target].push(row.header);
  }

  return out;
}

export function formatCellValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

function inferTargetField(header: string, availableFields: AvailableField[]) {
  const normalizedHeader = normalizeHeaderKey(header);
  if (!normalizedHeader) {
    return "";
  }

  const exactMatch = availableFields.find(
    (field) => normalizeHeaderKey(field.name) === normalizedHeader,
  );
  return exactMatch?.name ?? "";
}

function normalizeHeaderKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function sampleValueForHeader(
  sampleRows: Record<string, unknown>[],
  header: string,
): string {
  for (const row of sampleRows) {
    const value = row[header];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}
