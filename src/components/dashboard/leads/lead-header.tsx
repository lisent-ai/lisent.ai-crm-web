import { useTranslations } from "next-intl";

type LeadHeaderProps = {
  companyName: string;
  leadCount: number;
};

export function LeadHeader({ companyName, leadCount }: Readonly<LeadHeaderProps>) {
  const t = useTranslations();
  return (
    <header className="flex flex-wrap items-baseline gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] md:text-3xl">
        {t("nav.leads")}
      </h1>
      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
        {leadCount}
      </span>
      {companyName ? (
        <span className="text-sm text-[var(--text-tertiary)]">· {companyName}</span>
      ) : null}
    </header>
  );
}
