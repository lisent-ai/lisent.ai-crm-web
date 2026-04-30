"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CRMClientError,
  createSheetImport,
  listSheetTabs,
  listSpreadsheets,
  previewSheet,
  type SheetTabInfo,
  type SpreadsheetInfo,
} from "@/lib/crm/client";

type Step = "spreadsheet" | "tab" | "mapping" | "saving";

type FieldOption = {
  value: string;
  label: string;
  description?: string;
  required?: boolean;
};

// Standard CRM fields the operator can map a sheet column onto. The
// "extra_data" choice (empty string) sends the column into leads.extra_data
// so nothing is lost — we surface this as the explicit "ignore (keep raw)"
// option rather than letting it look like a destructive choice.
const FIELD_OPTIONS: FieldOption[] = [
  {
    value: "",
    label: "— Skip (saved to extra_data) —",
    description: "Column is preserved on the lead but doesn't fill a CRM field.",
  },
  { value: "name", label: "Lead name" },
  { value: "email", label: "Email", required: true },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "status", label: "Status" },
  { value: "value", label: "Value (numeric)" },
  { value: "source", label: "Source" },
  {
    value: "external_id",
    label: "External ID",
    description: "Stable unique key from your sheet (overrides our row-based ID).",
  },
];

// guessField turns a header into a likely CRM field. Ratings: high-confidence
// matches set the field; everything else stays unmapped so the operator
// chooses explicitly. We also flag the result so the UI can show an
// "Auto-detected" badge for transparency.
function guessField(header: string): string {
  const h = header.trim().toLowerCase();
  if (!h) return "";
  if (/(^|[\s_-])e?mail/.test(h)) return "email";
  if (/(^|[\s_-])(phone|gsm|mobile|tel)/.test(h)) return "phone";
  if (/(^|[\s_-])(name|isim|ad)$/.test(h) || h === "full name" || h === "ad soyad")
    return "name";
  if (/(^|[\s_-])(note|aciklama|açıklama|notes)/.test(h)) return "notes";
  if (h === "status" || h === "durum") return "status";
  if (/(^|[\s_-])(value|amount|tutar|price)/.test(h)) return "value";
  if (h === "source" || h === "kaynak") return "source";
  return "";
}

type Props = {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddSheetModal({ companyId, isOpen, onClose, onSaved }: Readonly<Props>) {
  const [step, setStep] = useState<Step>("spreadsheet");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetInfo[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<SpreadsheetInfo | null>(null);

  // Step 2
  const [tabs, setTabs] = useState<SheetTabInfo[]>([]);
  const [pickedTab, setPickedTab] = useState<SheetTabInfo | null>(null);

  // Step 3
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  // Track which mappings were auto-detected vs explicitly set, so the UI
  // can show an "Auto" badge. Once the operator changes a value the badge
  // disappears for that header.
  const [autoDetected, setAutoDetected] = useState<Record<string, boolean>>({});
  const [campaignLabel, setCampaignLabel] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [dataStart, setDataStart] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset on every open — wizard always starts fresh.
  useEffect(() => {
    if (!isOpen) return;
    setStep("spreadsheet");
    setError(null);
    setSpreadsheets([]);
    setSearch("");
    setPicked(null);
    setTabs([]);
    setPickedTab(null);
    setHeaders([]);
    setSampleRows([]);
    setMapping({});
    setAutoDetected({});
    setCampaignLabel("");
    setHeaderRow(1);
    setDataStart(2);
    setShowAdvanced(false);

    setLoading(true);
    listSpreadsheets(companyId)
      .then((files) => setSpreadsheets(files))
      .catch((err) =>
        setError(err instanceof CRMClientError ? err.message : "Failed to list spreadsheets"),
      )
      .finally(() => setLoading(false));
  }, [isOpen, companyId]);

  const filteredSpreadsheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return spreadsheets;
    return spreadsheets.filter((s) => s.name.toLowerCase().includes(q));
  }, [spreadsheets, search]);

  async function handlePickSpreadsheet(s: SpreadsheetInfo) {
    setPicked(s);
    setLoading(true);
    setError(null);
    try {
      const t = await listSheetTabs(companyId, s.id);
      setTabs(t);
      setStep("tab");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Failed to list tabs");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickTab(t: SheetTabInfo) {
    if (!picked) return;
    setPickedTab(t);
    setLoading(true);
    setError(null);
    try {
      const preview = await previewSheet(companyId, {
        spreadsheetId: picked.id,
        sheetName: t.title,
        headerRowNumber: 1,
        sampleRowCount: 5,
      });
      setHeaders(preview.headers);
      setSampleRows(preview.sample_rows);
      const guessed: Record<string, string> = {};
      const auto: Record<string, boolean> = {};
      preview.headers.forEach((h) => {
        const g = guessField(h);
        if (g) {
          guessed[h] = g;
          auto[h] = true;
        }
      });
      setMapping(guessed);
      setAutoDetected(auto);
      setCampaignLabel(`${picked.name} — ${t.title}`);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Failed to load preview");
    } finally {
      setLoading(false);
    }
  }

  // Required-field validation: email is the most useful signal for a
  // qualifier flow. Surfacing this as a warning (not a hard block) keeps
  // edge-case sheets (phone-only inbound, name-only) usable.
  const mappedFieldsSet = useMemo(() => {
    const s = new Set<string>();
    Object.values(mapping).forEach((v) => {
      if (v) s.add(v);
    });
    return s;
  }, [mapping]);

  const mappingHasAny = mappedFieldsSet.size > 0;
  const missingEmail = !mappedFieldsSet.has("email");

  async function handleSave() {
    if (!picked || !pickedTab) return;
    if (!campaignLabel.trim()) {
      setError("Campaign label can't be empty.");
      return;
    }
    if (!mappingHasAny) {
      setError("Map at least one column to a CRM field.");
      return;
    }
    setStep("saving");
    setError(null);
    try {
      const cleanedMapping: Record<string, string> = {};
      for (const [k, v] of Object.entries(mapping)) {
        if (v && v !== "") cleanedMapping[k] = v;
      }
      await createSheetImport(companyId, {
        spreadsheetId: picked.id,
        spreadsheetName: picked.name,
        sheetName: pickedTab.title,
        sheetGid: pickedTab.gid,
        campaignLabel: campaignLabel.trim(),
        headerRowNumber: headerRow,
        dataStartRow: dataStart,
        fieldMapping: cleanedMapping,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Failed to save");
      setStep("mapping");
    }
  }

  if (!isOpen) return null;

  const stepLabel: Record<Step, string> = {
    spreadsheet: "Pick a spreadsheet",
    tab: "Pick a tab",
    mapping: "Map columns to fields",
    saving: "Saving…",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-[var(--surface)] shadow-2xl">
        {/* Header with progress bar */}
        <header className="border-b border-[var(--border-subtle)] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Add Google Sheet
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {stepLabel[step]}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-[var(--border-default)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            >
              Cancel
            </button>
          </div>

          <ol className="mt-5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {(["spreadsheet", "tab", "mapping"] as const).map((s, i) => {
              const idx = ["spreadsheet", "tab", "mapping"].indexOf(step);
              const isCurrent = step === s;
              const isDone = idx > i || step === "saving";
              return (
                <li
                  key={s}
                  className="flex flex-grow items-center gap-2"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                      isDone
                        ? "bg-[var(--signal-green)] text-white"
                        : isCurrent
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-inset)] text-[var(--text-tertiary)]",
                    ].join(" ")}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span
                    className={
                      isCurrent
                        ? "truncate text-[var(--text-primary)]"
                        : "truncate"
                    }
                  >
                    {s === "spreadsheet" && "Spreadsheet"}
                    {s === "tab" && "Tab"}
                    {s === "mapping" && "Mapping"}
                  </span>
                  {i < 2 && (
                    <span
                      className={[
                        "flex-grow border-t",
                        isDone
                          ? "border-[var(--signal-green)]"
                          : "border-[var(--border-subtle)]",
                      ].join(" ")}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </header>

        {/* Body */}
        <div className="flex-grow overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--signal-red)_28%,transparent)] bg-[color-mix(in_srgb,var(--signal-red)_8%,var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
              {error}
            </div>
          )}

          {loading && (
            <div className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-2xl bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          )}

          {!loading && step === "spreadsheet" && (
            <div className="space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your Drive…"
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2.5 text-sm placeholder:text-[var(--text-tertiary)]"
              />
              <ul className="grid gap-2">
                {filteredSpreadsheets.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                    {search
                      ? `No spreadsheets matching "${search}".`
                      : "No spreadsheets in this Google account."}
                  </li>
                )}
                {filteredSpreadsheets.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handlePickSpreadsheet(s)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-left text-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                    >
                      <span className="min-w-0 flex-grow">
                        <span className="block truncate font-medium text-[var(--text-primary)]">
                          {s.name}
                        </span>
                        {s.modified_time && (
                          <span className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">
                            Modified {new Date(s.modified_time).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[var(--text-tertiary)]">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && step === "tab" && picked && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-xs">
                <span className="text-[var(--text-tertiary)]">From spreadsheet:</span>{" "}
                <span className="font-medium text-[var(--text-primary)]">{picked.name}</span>
              </div>
              <ul className="grid gap-2">
                {tabs.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                    No tabs found.
                  </li>
                )}
                {tabs.map((t) => (
                  <li key={t.gid}>
                    <button
                      type="button"
                      onClick={() => handlePickTab(t)}
                      disabled={t.is_hidden}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-left text-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="min-w-0 flex-grow">
                        <span className="block truncate font-medium text-[var(--text-primary)]">
                          {t.title}
                          {t.is_hidden && (
                            <span className="ml-2 rounded-full bg-[var(--surface-inset)] px-2 py-0.5 text-[10px] uppercase text-[var(--text-tertiary)]">
                              hidden
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">
                          {t.row_count.toLocaleString()} rows · {t.column_count} columns
                        </span>
                      </span>
                      <span className="shrink-0 text-[var(--text-tertiary)]">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(step === "mapping" || step === "saving") && picked && pickedTab && (
            <div className="space-y-5">
              {/* Source breadcrumb */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-xs">
                <span className="text-[var(--text-tertiary)]">Source:</span>{" "}
                <span className="font-medium text-[var(--text-primary)]">{picked.name}</span>
                <span className="mx-2 text-[var(--text-tertiary)]">→</span>
                <span className="font-medium text-[var(--text-primary)]">{pickedTab.title}</span>
                <span className="ml-2 text-[var(--text-tertiary)]">
                  ({headers.filter((h) => h.trim()).length} columns, {sampleRows.length} sample rows)
                </span>
              </div>

              {/* Campaign label */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Campaign label
                </span>
                <input
                  type="text"
                  value={campaignLabel}
                  onChange={(e) => setCampaignLabel(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm"
                  placeholder="e.g. Spring 2026 inbound"
                />
                <span className="mt-1 block text-[11px] text-[var(--text-tertiary)]">
                  This label appears as the campaign card on Marketing → Campaigns.
                </span>
              </label>

              {/* Mapping */}
              <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
                <header className="border-b border-[var(--border-subtle)] px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Column mapping
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Choose how each sheet column should land in the CRM. Unmapped
                    columns are preserved on{" "}
                    <code className="rounded bg-[var(--surface)] px-1 font-mono text-[10px]">
                      lead.extra_data
                    </code>{" "}
                    so nothing is lost.
                  </p>
                </header>

                {missingEmail && mappingHasAny && (
                  <div className="border-b border-[color-mix(in_srgb,var(--signal-amber,#d97706)_28%,transparent)] bg-[color-mix(in_srgb,var(--signal-amber,#d97706)_8%,var(--surface))] px-4 py-2.5 text-[11px] text-[var(--signal-amber,#a05a06)]">
                    ⚠ No column mapped to <strong>Email</strong>. Leads without
                    email won't get qualifier scoring.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        <th className="px-4 py-2 font-semibold">Sheet column</th>
                        <th className="px-4 py-2 font-semibold">Sample</th>
                        <th className="px-4 py-2 font-semibold">CRM field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {headers.map((h) => {
                        const isAuto = !!autoDetected[h] && !!mapping[h];
                        const sample = sampleRows[0]?.[h] ?? "";
                        return (
                          <tr key={h}>
                            <td className="px-4 py-2.5 align-top">
                              <span className="font-mono text-[13px] text-[var(--text-primary)]">
                                {h || (
                                  <span className="italic text-[var(--text-tertiary)]">
                                    (empty)
                                  </span>
                                )}
                              </span>
                              {isAuto && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--signal-green)_12%,var(--surface))] px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-green)]">
                                  auto
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-top">
                              {sample ? (
                                <span className="block max-w-[180px] truncate text-[12px] text-[var(--text-secondary)]">
                                  {sample}
                                </span>
                              ) : (
                                <span className="text-[12px] italic text-[var(--text-tertiary)]">
                                  empty
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-top">
                              <select
                                value={mapping[h] ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setMapping((prev) => ({ ...prev, [h]: v }));
                                  setAutoDetected((prev) => ({ ...prev, [h]: false }));
                                }}
                                className="w-full max-w-[260px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px]"
                              >
                                {FIELD_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                    {opt.required ? " (recommended)" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Sample rows preview */}
              {sampleRows.length > 0 && (
                <details className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
                    Preview sample rows ({sampleRows.length})
                  </summary>
                  <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[var(--surface)] text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {headers.map((h) => (
                            <th key={h} className="px-3 py-2 font-semibold">
                              {h || "(empty)"}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {sampleRows.map((row, i) => (
                          <tr key={i}>
                            {headers.map((h) => (
                              <td
                                key={h}
                                className="max-w-[180px] truncate px-3 py-2 text-[var(--text-secondary)]"
                              >
                                {row[h] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {/* Advanced options */}
              <details
                open={showAdvanced}
                onToggle={(e) => setShowAdvanced(e.currentTarget.open)}
                className="rounded-2xl border border-[var(--border-subtle)]"
              >
                <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
                  Advanced options
                </summary>
                <div className="grid gap-3 border-t border-[var(--border-subtle)] px-4 py-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Header row
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={headerRow}
                      onChange={(e) =>
                        setHeaderRow(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Data starts at row
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={dataStart}
                      onChange={(e) =>
                        setDataStart(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                    />
                  </label>
                </div>
              </details>

              {/* What happens next */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))] px-4 py-3 text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">What happens next:</strong>{" "}
                Save creates the link. Click <strong>Sync now</strong> to import
                rows on demand. Each row becomes a lead, identified by a stable
                ID — re-syncing won't duplicate them, only update changed cells.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-4">
          <button
            type="button"
            onClick={() => {
              if (step === "tab") setStep("spreadsheet");
              else if (step === "mapping") setStep("tab");
            }}
            disabled={step === "spreadsheet" || step === "saving" || loading}
            className="rounded-full border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)] disabled:opacity-40"
          >
            ← Back
          </button>
          {step === "mapping" && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {mappedFieldsSet.size} of {headers.filter((h) => h.trim()).length}{" "}
                columns mapped
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={!mappingHasAny || !campaignLabel.trim()}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                Save and sync
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
