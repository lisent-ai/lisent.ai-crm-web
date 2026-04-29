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

const FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "— ignore (extra_data) —" },
  { value: "name", label: "Lead name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "status", label: "Status" },
  { value: "value", label: "Value (number)" },
  { value: "source", label: "Source" },
  { value: "external_id", label: "External ID (unique row key)" },
];

// Heuristic header-name → CRM field guess. Plays "good enough" so the
// operator usually accepts defaults and clicks Save. Operator can override
// any row before saving.
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
  const [picked, setPicked] = useState<SpreadsheetInfo | null>(null);

  // Step 2
  const [tabs, setTabs] = useState<SheetTabInfo[]>([]);
  const [pickedTab, setPickedTab] = useState<SheetTabInfo | null>(null);

  // Step 3
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [campaignLabel, setCampaignLabel] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [dataStart, setDataStart] = useState(2);

  // Reset every time the modal opens — wizard always starts fresh.
  useEffect(() => {
    if (!isOpen) return;
    setStep("spreadsheet");
    setError(null);
    setSpreadsheets([]);
    setPicked(null);
    setTabs([]);
    setPickedTab(null);
    setHeaders([]);
    setSampleRows([]);
    setMapping({});
    setCampaignLabel("");
    setHeaderRow(1);
    setDataStart(2);

    setLoading(true);
    listSpreadsheets(companyId)
      .then((files) => setSpreadsheets(files))
      .catch((err) =>
        setError(err instanceof CRMClientError ? err.message : "Failed to list spreadsheets"),
      )
      .finally(() => setLoading(false));
  }, [isOpen, companyId]);

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
      preview.headers.forEach((h) => {
        const g = guessField(h);
        if (g) guessed[h] = g;
      });
      setMapping(guessed);
      setCampaignLabel(`${picked.name} — ${t.title}`);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Failed to load preview");
    } finally {
      setLoading(false);
    }
  }

  const mappingHasAny = useMemo(
    () => Object.values(mapping).some((v) => v && v !== ""),
    [mapping],
  );

  async function handleSave() {
    if (!picked || !pickedTab) return;
    if (!campaignLabel.trim()) {
      setError("Campaign label cannot be empty");
      return;
    }
    if (!mappingHasAny) {
      setError("Map at least one column to a CRM field");
      return;
    }
    setStep("saving");
    setError(null);
    try {
      // Strip empty mappings before saving — backend rejects empty strings.
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[var(--surface)] shadow-xl">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Add Google Sheet
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {step === "spreadsheet" && "Step 1 of 3 — pick a spreadsheet from your Drive"}
              {step === "tab" && "Step 2 of 3 — pick a tab inside the spreadsheet"}
              {step === "mapping" && "Step 3 of 3 — map columns to CRM fields"}
              {step === "saving" && "Saving…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border-default)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
          >
            Cancel
          </button>
        </header>

        <div className="flex-grow overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--signal-red)_28%,transparent)] bg-[color-mix(in_srgb,var(--signal-red)_8%,var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
          )}

          {!loading && step === "spreadsheet" && (
            <ul className="grid gap-2">
              {spreadsheets.length === 0 && (
                <li className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-tertiary)]">
                  No spreadsheets found in this Google account.
                </li>
              )}
              {spreadsheets.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handlePickSpreadsheet(s)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-left text-sm transition hover:border-[var(--border-strong)]"
                  >
                    <span className="min-w-0 flex-grow truncate font-medium text-[var(--text-primary)]">
                      {s.name}
                    </span>
                    {s.modified_time && (
                      <span className="ml-3 shrink-0 text-xs text-[var(--text-tertiary)]">
                        {new Date(s.modified_time).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && step === "tab" && (
            <ul className="grid gap-2">
              {tabs.length === 0 && (
                <li className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-tertiary)]">
                  No tabs found.
                </li>
              )}
              {tabs.map((t) => (
                <li key={t.gid}>
                  <button
                    type="button"
                    onClick={() => handlePickTab(t)}
                    disabled={t.is_hidden}
                    className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-left text-sm transition hover:border-[var(--border-strong)] disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-grow truncate font-medium text-[var(--text-primary)]">
                      {t.title}
                    </span>
                    <span className="ml-3 shrink-0 text-xs text-[var(--text-tertiary)]">
                      {t.row_count} rows × {t.column_count} cols
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {(step === "mapping" || step === "saving") && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Campaign label
                  </span>
                  <input
                    type="text"
                    value={campaignLabel}
                    onChange={(e) => setCampaignLabel(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Header row
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={headerRow}
                      onChange={(e) => setHeaderRow(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Data starts at
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={dataStart}
                      onChange={(e) => setDataStart(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Column mapping
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Unmapped columns are saved into{" "}
                  <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono">extra_data</code>{" "}
                  so nothing is lost.
                </p>
                <ul className="mt-3 grid gap-2">
                  {headers.map((h) => (
                    <li key={h} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-[var(--text-primary)]">
                          {h || <span className="italic text-[var(--text-tertiary)]">(empty)</span>}
                        </p>
                        {sampleRows[0]?.[h] && (
                          <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                            e.g. {sampleRows[0][h]}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">→</span>
                      <select
                        value={mapping[h] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [h]: e.target.value }))
                        }
                        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm"
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-4">
          <button
            type="button"
            onClick={() => {
              if (step === "tab") setStep("spreadsheet");
              else if (step === "mapping") setStep("tab");
            }}
            disabled={step === "spreadsheet" || step === "saving" || loading}
            className="rounded-full border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)] disabled:opacity-50"
          >
            Back
          </button>
          {step === "mapping" ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!mappingHasAny || !campaignLabel.trim()}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              Save and sync
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
