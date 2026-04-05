"use client";

import { useState, useEffect } from "react";
import type { LeadFilterParams } from "@/lib/qualifier/client";
import { getExportUrl } from "@/lib/qualifier/client";

type Props = {
  companyId: string;
  value: LeadFilterParams;
  onChange: (params: LeadFilterParams) => void;
};

export function QualifierLeadFilters({ companyId, value, onChange }: Readonly<Props>) {
  const [searchInput, setSearchInput] = useState(value.search ?? "");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (value.search ?? "")) {
        onChange({ ...value, search: searchInput || undefined, offset: 0 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch: Partial<LeadFilterParams>) {
    onChange({ ...value, ...patch, offset: 0 });
  }

  function handleClear() {
    setSearchInput("");
    onChange({ limit: value.limit });
  }

  const hasFilters = !!(
    value.status || value.source || value.path ||
    value.score_min !== undefined || value.score_max !== undefined ||
    value.date_from || value.date_to || value.search
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <input
        type="text"
        placeholder="Ad veya telefon ara..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {/* Status */}
      <select
        value={value.status ?? ""}
        onChange={(e) => update({ status: e.target.value || undefined })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none"
      >
        <option value="">Durum: Tumu</option>
        <option value="new">Yeni</option>
        <option value="qualifying">Islemde</option>
        <option value="qualified">Qualify</option>
        <option value="done">Tamamlandi</option>
        <option value="lost">Kayip</option>
      </select>

      {/* Source */}
      <select
        value={value.source ?? ""}
        onChange={(e) => update({ source: e.target.value || undefined })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none"
      >
        <option value="">Kaynak: Tumu</option>
        <option value="website">Website</option>
        <option value="facebook">Facebook</option>
        <option value="instagram">Instagram</option>
        <option value="google">Google</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="referral">Referans</option>
      </select>

      {/* Path */}
      <select
        value={value.path ?? ""}
        onChange={(e) => update({ path: e.target.value || undefined })}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none"
      >
        <option value="">Yol: Tumu</option>
        <option value="fast">Hizli Yol</option>
        <option value="chat">Sohbet</option>
      </select>

      {/* Score range */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Min"
          value={value.score_min ?? ""}
          onChange={(e) => update({ score_min: e.target.value ? Number(e.target.value) : undefined })}
          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none"
        />
        <span className="text-xs text-slate-400">-</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Max"
          value={value.score_max ?? ""}
          onChange={(e) => update({ score_max: e.target.value ? Number(e.target.value) : undefined })}
          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none"
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
        >
          Temizle
        </button>
      )}

      {/* Export */}
      <a
        href={getExportUrl(companyId, value)}
        download
        className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700"
      >
        CSV Indir
      </a>
    </div>
  );
}
