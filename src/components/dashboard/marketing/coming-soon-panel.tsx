import { useTranslations } from "next-intl";

type ComingSoonPanelProps = {
  slug: "forms" | "email";
};

// ComingSoonPanel is the placeholder we show under Marketing → Forms and
// Marketing → Email. The IA matters more than the content here: getting
// the routes + tab strip in place now means the eventual feature drop is
// a straight component swap rather than a navigation overhaul.
export function ComingSoonPanel({ slug }: Readonly<ComingSoonPanelProps>) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-8 shadow-[var(--shadow-xs)]">
      <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
        {t("marketing.comingSoon.badge")}
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t(`marketing.comingSoon.${slug}.title`)}
        </h2>
        <p className="max-w-prose text-sm text-[var(--text-secondary)]">
          {t(`marketing.comingSoon.${slug}.description`)}
        </p>
      </div>
    </div>
  );
}
