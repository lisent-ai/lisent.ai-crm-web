import { ToggleButton } from "./import-ui";

export function ImportSourceStep({
  sourceMode,
  csvURL,
  csvFile,
  loadingSuggestion,
  onSetSourceMode,
  onSetCSVURL,
  onSetCSVFile,
  onContinue,
}: Readonly<{
  sourceMode: "upload" | "url";
  csvURL: string;
  csvFile: File | null;
  loadingSuggestion: boolean;
  onSetSourceMode: (mode: "upload" | "url") => void;
  onSetCSVURL: (value: string) => void;
  onSetCSVFile: (file: File | null) => void;
  onContinue: () => void;
}>) {
  return (
    <div>
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
        <ToggleButton
          active={sourceMode === "upload"}
          label="Upload CSV"
          onClick={() => onSetSourceMode("upload")}
        />
        <ToggleButton
          active={sourceMode === "url"}
          label="Use URL"
          onClick={() => onSetSourceMode("url")}
        />
      </div>

      {sourceMode === "upload" ? (
        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <p className="text-base font-semibold text-slate-950">CSV upload</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Upload a sample CSV file. The backend reads headers and sample rows,
            then asks Groq for mapping suggestions.
          </p>
          <input
            accept=".csv,text/csv"
            className="mt-5 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              onSetCSVFile(nextFile);
            }}
            type="file"
          />
          <p className="mt-3 text-xs text-slate-500">
            {csvFile ? `Selected: ${csvFile.name}` : "No file selected."}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <p className="text-base font-semibold text-slate-950">CSV URL</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Paste a direct CSV URL (for Google Sheets use the `/export?format=csv`
            URL, not `/edit`).
          </p>
          <input
            className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            onChange={(event) => onSetCSVURL(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0"
            value={csvURL}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadingSuggestion}
          onClick={onContinue}
          type="button"
        >
          {loadingSuggestion ? "Processing..." : "Continue to preview"}
        </button>
      </div>
    </div>
  );
}
