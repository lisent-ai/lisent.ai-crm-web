import { Stat } from "./import-ui";
import { formatCellValue } from "./import-utils";

export function ImportPreviewStep({
  headers,
  sampleRows,
  allRowsCount,
  mappedCount,
  onBack,
  onContinue,
}: Readonly<{
  headers: string[];
  sampleRows: Record<string, unknown>[];
  allRowsCount: number;
  mappedCount: number;
  onBack: () => void;
  onContinue: () => void;
}>) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Headers" value={String(headers.length)} />
        <Stat label="Rows shown" value={String(sampleRows.length)} />
        <Stat label="Rows loaded" value={String(allRowsCount)} />
        <Stat label="Unmapped" value={String(headers.length - mappedCount)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.22em] text-slate-500">
              <tr>
                {headers.map((header) => (
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
                  {headers.map((header) => (
                    <td className="px-4 py-3 text-slate-700" key={header}>
                      {formatCellValue(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          onClick={onBack}
          type="button"
        >
          Back to source
        </button>
        <button
          className="rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110"
          onClick={onContinue}
          type="button"
        >
          Continue to mapping
        </button>
      </div>
    </div>
  );
}
