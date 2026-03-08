"use client";

import { useEffect, useState } from "react";

export type Company = {
  id: string;
  name: string;
  country: string;
  industry: string;
};

export type Customer = {
  id: string;
  companyId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  preferredLanguage: string;
  countryCode: string;
  extraData: Record<string, string>;
};

export const defaultCompanies: Company[] = [
  {
    id: "lisent-ai",
    name: "Lisent.ai",
    country: "Germany",
    industry: "CRM",
  },
  {
    id: "atlas-retail",
    name: "Atlas Retail",
    country: "Turkey",
    industry: "Retail",
  },
];

export const defaultCustomersByCompany: Record<string, Customer[]> = {
  "lisent-ai": [
    {
      id: "cust-1",
      companyId: "lisent-ai",
      name: "Ahmet Yilmaz",
      firstName: "Ahmet",
      lastName: "Yilmaz",
      email: "ahmet@test.com",
      phone: "05321234567",
      status: "Active",
      preferredLanguage: "tr",
      countryCode: "DE",
      extraData: {
        city: "Berlin",
        company_name: "Lisent.ai",
        website: "https://lisent.ai",
        subscription_date: "2024-01-10",
        external_customer_id: "LIS-1001",
        phone_2: "030-555-1001",
      },
    },
    {
      id: "cust-2",
      companyId: "lisent-ai",
      name: "Zeynep Kaya",
      firstName: "Zeynep",
      lastName: "Kaya",
      email: "zeynep@test.com",
      phone: "05335557788",
      status: "Active",
      preferredLanguage: "tr",
      countryCode: "DE",
      extraData: {
        city: "Hamburg",
        company_name: "Lisent.ai",
        website: "https://lisent.ai",
        subscription_date: "2024-01-12",
        external_customer_id: "LIS-1002",
        phone_2: "040-555-1002",
      },
    },
    {
      id: "cust-3",
      companyId: "lisent-ai",
      name: "Elif Demir",
      firstName: "Elif",
      lastName: "Demir",
      email: "elif@test.com",
      phone: "05329998877",
      status: "Needs review",
      preferredLanguage: "en",
      countryCode: "DE",
      extraData: {
        city: "Munich",
        company_name: "Lisent.ai",
        website: "https://lisent.ai",
        subscription_date: "2024-01-18",
        external_customer_id: "LIS-1003",
        phone_2: "089-555-1003",
      },
    },
  ],
  "atlas-retail": [
    {
      id: "cust-4",
      companyId: "atlas-retail",
      name: "Mert Aydin",
      firstName: "Mert",
      lastName: "Aydin",
      email: "mert@atlas.com",
      phone: "05324445566",
      status: "Active",
      preferredLanguage: "tr",
      countryCode: "TR",
      extraData: {
        city: "Istanbul",
        company_name: "Atlas Retail",
        website: "https://atlas-retail.example",
        subscription_date: "2024-02-01",
        external_customer_id: "ATL-2001",
        phone_2: "0212-444-2001",
      },
    },
    {
      id: "cust-5",
      companyId: "atlas-retail",
      name: "Sena Cakir",
      firstName: "Sena",
      lastName: "Cakir",
      email: "sena@atlas.com",
      phone: "05327776655",
      status: "Prospect",
      preferredLanguage: "en",
      countryCode: "TR",
      extraData: {
        city: "Ankara",
        company_name: "Atlas Retail",
        website: "https://atlas-retail.example",
        subscription_date: "2024-02-05",
        external_customer_id: "ATL-2002",
        phone_2: "0312-777-2002",
      },
    },
  ],
};

const companiesKey = "crm-web-demo-companies";
const customersKey = "crm-web-demo-customers";

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(key);

  if (!storedValue) {
    return fallback;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeExtraData(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, String(entryValue)]),
  );
}

function normalizeCustomer(raw: unknown, companyId: string, index: number): Customer {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const providedName = toStringValue(source.name);
  const providedFirstName = toStringValue(source.firstName);
  const providedLastName = toStringValue(source.lastName);
  const inferredName = [providedFirstName, providedLastName]
    .join(" ")
    .trim();
  const name = providedName || inferredName || `Customer ${index + 1}`;

  const firstName = providedFirstName || name.split(/\s+/)[0] || "Customer";
  const lastName = providedLastName || name.split(/\s+/).slice(1).join(" ");

  return {
    id: toStringValue(source.id, `cust-${companyId}-${index + 1}`),
    companyId: toStringValue(source.companyId, companyId),
    name,
    firstName,
    lastName,
    email: toStringValue(source.email),
    phone: toStringValue(source.phone),
    status: toStringValue(source.status, "Active"),
    preferredLanguage: toStringValue(source.preferredLanguage, "en"),
    countryCode: toStringValue(source.countryCode, "--"),
    extraData: normalizeExtraData(source.extraData),
  };
}

function normalizeCustomersByCompany(raw: unknown): Record<string, Customer[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultCustomersByCompany;
  }

  const source = raw as Record<string, unknown>;
  const normalized: Record<string, Customer[]> = {};

  for (const [companyId, value] of Object.entries(source)) {
    if (!Array.isArray(value)) {
      continue;
    }

    normalized[companyId] = value.map((customer, index) =>
      normalizeCustomer(customer, companyId, index),
    );
  }

  return Object.keys(normalized).length ? normalized : defaultCustomersByCompany;
}

export function useMockCrmStore() {
  const [companies, setCompanies] = useState<Company[]>(() =>
    readStoredValue(companiesKey, defaultCompanies),
  );
  const [customersByCompany, setCustomersByCompany] = useState<
    Record<string, Customer[]>
  >(() =>
    normalizeCustomersByCompany(
      readStoredValue(customersKey, defaultCustomersByCompany),
    ),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(companiesKey, JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(customersKey, JSON.stringify(customersByCompany));
  }, [customersByCompany]);

  return {
    companies,
    setCompanies,
    customersByCompany,
    setCustomersByCompany,
  };
}
