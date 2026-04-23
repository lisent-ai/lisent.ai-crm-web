type LeadHeaderProps = {
  companyName: string;
  leadCount: number;
};

export function LeadHeader({ companyName, leadCount }: Readonly<LeadHeaderProps>) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
          Leads
        </h1>
        <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
          {leadCount}
        </span>
      </div>
      <p className="text-sm text-[var(--text-tertiary)]">
        Track, qualify and convert your pipeline{" "}
        {companyName ? (
          <span className="text-[var(--text-secondary)]">· {companyName}</span>
        ) : null}
      </p>
    </header>
  );
}
