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
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
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
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">{value}</p>
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
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <header className="border-b border-[var(--border-subtle)] px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          {title}
        </p>
      </header>
      <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 text-sm">
        {rows.map((row) => (
          <Fragment key={`${title}-${row.label}`}>
            <dt className="truncate text-[var(--text-tertiary)]">{row.label}</dt>
            <dd className="break-words font-medium text-[var(--text-primary)]">{row.value}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
