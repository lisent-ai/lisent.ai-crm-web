"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type MappingRow = {
  header: string;
  sampleValue: string;
  targetField: string;
  confidence: number;
  reason: string;
};

type StepId = "source" | "preview" | "mapping";

const availableFields = [
  { name: "first_name", description: "Given name of the customer." },
  { name: "last_name", description: "Family name of the customer." },
  { name: "email", description: "Primary email address." },
  { name: "phone", description: "Primary phone number." },
  { name: "preferred_language", description: "Language code such as tr or en." },
  { name: "country_code", description: "Country code such as TR or DE." },
  { name: "subscription_date", description: "Signup or subscription date." },
  { name: "external_customer_id", description: "Source system identifier." },
];

const sampleHeaders = [
  "Ad",
  "Soyad",
  "Customer_PNumber",
  "E-posta",
  "UyelikTarihi",
];

const sampleRows = [
  {
    Ad: "Ahmet",
    Soyad: "Yilmaz",
    Customer_PNumber: "05321234567",
    "E-posta": "ahmet@test.com",
    UyelikTarihi: "2024-01-10",
  },
  {
    Ad: "Zeynep",
    Soyad: "Kaya",
    Customer_PNumber: "05335557788",
    "E-posta": "zeynep@test.com",
    UyelikTarihi: "2024-01-12",
  },
];

const initialMappingRows: MappingRow[] = [
  {
    header: "Ad",
    sampleValue: "Ahmet",
    targetField: "first_name",
    confidence: 0.96,
    reason: "Turkish header strongly matches given name.",
  },
  {
    header: "Soyad",
    sampleValue: "Yilmaz",
    targetField: "last_name",
    confidence: 0.97,
    reason: "Turkish surname label maps directly to last name.",
  },
  {
    header: "Customer_PNumber",
    sampleValue: "05321234567",
    targetField: "phone",
    confidence: 0.93,
    reason: "Phone-like values and source naming indicate primary phone.",
  },
  {
    header: "E-posta",
    sampleValue: "ahmet@test.com",
    targetField: "email",
    confidence: 0.99,
    reason: "Header is a direct Turkish variant of email.",
  },
  {
    header: "UyelikTarihi",
    sampleValue: "2024-01-10",
    targetField: "subscription_date",
    confidence: 0.88,
    reason: "Header indicates membership or signup date.",
  },
];

const steps = [
  {
    id: "source" as const,
    stepNumber: "01",
    label: "Source",
    title: "Select the CSV source",
    summary: "Upload a CSV file or paste a direct CSV export URL.",
  },
  {
    id: "preview" as const,
    stepNumber: "02",
    label: "Preview",
    title: "Inspect parsed headers and sample rows",
    summary: "Confirm the structure before mapping any fields.",
  },
  {
    id: "mapping" as const,
    stepNumber: "03",
    label: "Mapping",
    title: "Review and approve field suggestions",
    summary: "Approving the mapping should lead to the customer directory page.",
  },
];

export function ImportWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceMode, setSourceMode] = useState<"upload" | "url">("upload");
  const [fallbackAliasesEnabled, setFallbackAliasesEnabled] = useState(true);
  const [mappingRows, setMappingRows] = useState(initialMappingRows);
  const [activeStep, setActiveStep] = useState<StepId>("source");

  const companyId = searchParams.get("company") ?? "lisent-ai";
  const companyName = searchParams.get("companyName") ?? "Selected company";
  const mappedCount = mappingRows.filter((row) => row.targetField !== "").length;
  const activeStepMeta = useMemo(
    () => steps.find((step) => step.id === activeStep) ?? steps[0],
    [activeStep],
  );

  function updateTargetField(header: string, targetField: string) {
    setMappingRows((current) =>
      current.map((row) =>
        row.header === header ? { ...row, targetField } : row,
      ),
    );
  }

  function approveMapping() {
    router.push(
      `/dashboard/customers?company=${companyId}&companyName=${encodeURIComponent(companyName)}&source=import-approved`,
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Customer import
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {companyName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              This is the company-specific import screen. After the user
              approves the mapping, the flow should continue on the customer
              directory page for this company.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/dashboard/companies"
            >
              Back to companies
            </Link>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              Company ID: {companyId}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#fffdf7,_#f8fafc)] p-4 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Import steps</h2>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {activeStepMeta.stepNumber} / 03
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {steps.map((step) => {
              const active = step.id === activeStep;

              return (
                <button
                  className={`rounded-[1.4rem] border p-4 text-left transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  type="button"
                >
                  <p
                    className={`text-sm font-semibold uppercase tracking-[0.24em] ${
                      active ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Step {step.stepNumber}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">
                    {step.label}
                  </h3>
                  <p
                    className={`mt-3 text-sm leading-6 ${
                      active ? "text-slate-200" : "text-slate-600"
                    }`}
                  >
                    {step.summary}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Progress
            </p>
            <div className="mt-3 grid gap-3">
              <Stat label="Headers" value={String(sampleHeaders.length)} />
              <Stat label="Mapped fields" value={String(mappedCount)} />
              <Stat label="Rows previewed" value={String(sampleRows.length)} />
            </div>
          </div>
        </aside>

        <section className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
            Step {activeStepMeta.stepNumber}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {activeStepMeta.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {activeStepMeta.summary}
          </p>

          <div className="mt-8">
            {activeStep === "source" && (
              <div>
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                  <ToggleButton
                    active={sourceMode === "upload"}
                    label="Upload CSV"
                    onClick={() => setSourceMode("upload")}
                  />
                  <ToggleButton
                    active={sourceMode === "url"}
                    label="Use URL"
                    onClick={() => setSourceMode("url")}
                  />
                </div>

                {sourceMode === "upload" ? (
                  <InfoBlock
                    body="The final version will accept a CSV file here, validate the extension, and prepare sample rows for review."
                    title="Upload interaction"
                  >
                    customers-100.csv
                  </InfoBlock>
                ) : (
                  <InfoBlock
                    body="The final version will accept direct CSV export URLs such as Google Sheets export links."
                    title="CSV URL interaction"
                  >
                    https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0
                  </InfoBlock>
                )}
              </div>
            )}

            {activeStep === "preview" && (
              <div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Stat label="Headers" value={String(sampleHeaders.length)} />
                  <Stat label="Rows shown" value={String(sampleRows.length)} />
                  <Stat label="Unmapped" value="0" />
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-800">
                      <thead className="bg-slate-100 text-xs uppercase tracking-[0.22em] text-slate-500">
                        <tr>
                          {sampleHeaders.map((header) => (
                            <th className="px-4 py-3 font-medium" key={header}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.map((row, index) => (
                          <tr
                            className="border-t border-slate-200 bg-white"
                            key={`sample-row-${index + 1}`}
                          >
                            {sampleHeaders.map((header) => (
                              <td className="px-4 py-3 text-slate-700" key={header}>
                                {row[header as keyof typeof row]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "mapping" && (
              <div>
                <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800">
                  <input
                    checked={fallbackAliasesEnabled}
                    className="size-4 accent-slate-900"
                    onChange={(event) => setFallbackAliasesEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  Enable fallback aliases
                </label>

                <div className="mt-6 grid gap-4">
                  {mappingRows.map((row) => (
                    <div
                      className="grid gap-4 rounded-[1.4rem] border border-slate-200 bg-white p-5 md:grid-cols-[0.95fr_1fr_1.15fr]"
                      key={row.header}
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Source header
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-slate-950">
                          {row.header}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Sample: {row.sampleValue}
                        </p>
                      </div>

                      <div className="relative z-20">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Target field
                        </p>
                        <select
                          className="relative mt-2 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 focus:border-slate-900"
                          onChange={(event) =>
                            updateTargetField(row.header, event.target.value)
                          }
                          value={row.targetField}
                        >
                          <option className="bg-white text-slate-900" value="">
                            Leave unmapped
                          </option>
                          {availableFields.map((field) => (
                            <option
                              className="bg-white text-slate-900"
                              key={field.name}
                              value={field.name}
                            >
                              {field.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                          {
                            availableFields.find(
                              (field) => field.name === row.targetField,
                            )?.description
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Suggestion note
                        </p>
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                          {row.reason}
                          <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                            Confidence {Math.round(row.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-white p-5">
                  <p className="text-lg font-semibold text-slate-950">
                    Approval outcome
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    After the user approves the mapping, the workflow should
                    continue on the separate customer list page for {companyName}.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
                      onClick={approveMapping}
                      type="button"
                    >
                      Approve mapping and open customers
                    </button>
                    <button
                      className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                      onClick={() => setActiveStep("preview")}
                      type="button"
                    >
                      Back to preview
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]"
          : "text-slate-600 hover:text-slate-950"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InfoBlock({
  title,
  body,
  children,
}: Readonly<{
  title: string;
  body: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        {children}
      </div>
    </div>
  );
}
