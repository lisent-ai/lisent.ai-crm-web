import { Fragment } from "react";

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function Field({
  label,
  value,
  placeholder,
  onChange,
}: Readonly<FieldProps>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

type CompactMetaProps = {
  label: string;
  value: string;
};

export function CompactMeta({ label, value }: Readonly<CompactMetaProps>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

type DetailSectionCompactProps = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export function DetailSectionCompact({
  title,
  rows,
}: Readonly<DetailSectionCompactProps>) {
  return (
    <section className="rounded-[1.1rem] border border-slate-200 bg-slate-50">
      <header className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
          {title}
        </p>
      </header>
      <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 text-sm">
        {rows.map((row) => (
          <Fragment key={`${title}-${row.label}`}>
            <dt className="truncate text-slate-500">{row.label}</dt>
            <dd className="break-words font-medium text-slate-900">{row.value}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
