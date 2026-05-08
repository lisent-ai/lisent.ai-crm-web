"use client";

import type { Customer } from "@/lib/crm/client";

// CSV columns intentionally mirror the Excel/PDF column set so a user
// can compare the three exports side-by-side without one losing fields.
// Column order matches the on-screen table where possible (name, phone,
// email, country, status) and then drops to the less-visible profile
// fields after that.
const CSV_HEADERS = [
  "id",
  "company_id",
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "status",
  "preferred_language",
  "country_code",
] as const;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // RFC 4180: quote any cell containing a delimiter, CR/LF, or quote;
  // double internal quotes per spec.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCustomerCsv(customers: readonly Customer[]): string {
  const rows = customers.map((customer) =>
    [
      customer.id,
      customer.companyId,
      customer.name,
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.status,
      customer.preferredLanguage,
      customer.countryCode,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
}

export function downloadCustomerCsv(
  customers: readonly Customer[],
  filename: string,
): void {
  // UTF-8 BOM lets Excel for Windows pick up Turkish/German diacritics
  // correctly when a user double-clicks the .csv. The cost (3 bytes) is
  // negligible and other tools that read CSV ignore the BOM gracefully.
  const csv = "﻿" + buildCustomerCsv(customers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
