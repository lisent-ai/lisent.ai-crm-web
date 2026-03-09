"use client";

export type ParsedCSV = {
  headers: string[];
  rows: Record<string, string>[];
};

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  return parseCSVText(await file.text());
}

export async function parseCSVFromURL(rawURL: string): Promise<ParsedCSV> {
  const response = await fetch(rawURL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV URL (${response.status})`);
  }

  return parseCSVText(await response.text());
}

export function parseCSVText(input: string): ParsedCSV {
  const records = tokenizeCSV(stripUTF8BOM(input));
  if (records.length === 0) {
    throw new Error("CSV is empty");
  }

  const headers = records[0].map((header) => header.trim());
  if (headers.every((header) => header === "")) {
    throw new Error("CSV headers must not be empty");
  }

  const rows: Record<string, string>[] = [];
  for (const record of records.slice(1)) {
    if (record.every((value) => value.trim() === "")) {
      continue;
    }
    if (record.length > headers.length) {
      throw new Error("CSV row has more values than headers");
    }

    const row: Record<string, string> = {};
    for (let index = 0; index < headers.length; index += 1) {
      row[headers[index]] = record[index] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

function stripUTF8BOM(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function tokenizeCSV(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("CSV contains an unterminated quoted field");
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
