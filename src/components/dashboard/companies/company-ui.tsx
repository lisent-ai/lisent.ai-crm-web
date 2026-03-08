type CompanyFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function CompanyField({
  label,
  value,
  placeholder,
  onChange,
}: Readonly<CompanyFieldProps>) {
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

type DetailMetricProps = {
  label: string;
  value: string;
};

export function DetailMetric({ label, value }: Readonly<DetailMetricProps>) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
