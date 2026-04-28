"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export type CampaignSummary = {
  key: string;
  source: string;
  campaignId: string | null;
  campaignName: string;
  formName: string | null;
  totalLeads: number;
  qualifiedLeads: number;
  lastLeadAt: string | null;
};

type CampaignCardProps = {
  campaign: CampaignSummary;
  companyId: string;
  companyName: string;
};

// CampaignCard renders one campaign group. Click → opens Leads filtered
// by source + campaign, so the operator can drill into the contributing
// leads without any extra UI work in the leads page (the source filter
// already exists; we just deep-link with the right query params).
export function CampaignCard({
  campaign,
  companyId,
  companyName,
}: Readonly<CampaignCardProps>) {
  const t = useTranslations();

  const params = new URLSearchParams();
  if (companyId) params.set("company", companyId);
  if (companyName) params.set("companyName", companyName);
  params.set("source", campaign.source);
  if (campaign.campaignId) params.set("campaign", campaign.campaignId);

  const href = `/dashboard/leads?${params.toString()}`;
  const sourceLabel = sourceTitle(campaign.source, t);

  return (
    <article className="flex flex-col gap-4 rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
      <header className="flex flex-col gap-2">
        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${sourceBadgeClass(campaign.source)}`}>
          {sourceLabel}
        </span>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {campaign.campaignName}
        </h3>
        {campaign.formName && (
          <p className="text-xs text-[var(--text-tertiary)]">
            {t("marketing.campaigns.cardForm", { form: campaign.formName })}
          </p>
        )}
      </header>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.campaigns.cardLeads")}
          </dt>
          <dd className="text-lg font-semibold text-[var(--text-primary)]">
            {campaign.totalLeads}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.campaigns.cardQualified")}
          </dt>
          <dd className="text-lg font-semibold text-[var(--signal-green)]">
            {campaign.qualifiedLeads}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col">
          <dt className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.campaigns.cardLastLead")}
          </dt>
          <dd className="text-sm text-[var(--text-secondary)]">
            {campaign.lastLeadAt
              ? new Date(campaign.lastLeadAt).toLocaleString()
              : t("marketing.campaigns.cardNoLeads")}
          </dd>
        </div>
      </dl>
      <Link
        className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent-strong)] hover:bg-[var(--accent)] hover:text-white"
        href={href}
      >
        {t("marketing.campaigns.cardViewLeads")} →
      </Link>
    </article>
  );
}

function sourceTitle(source: string, t: ReturnType<typeof useTranslations>): string {
  const key = `marketing.campaigns.sources.${source}`;
  // Fall back to capitalised source string if the translation key is
  // missing (e.g. a vendor source we haven't added yet).
  try {
    return t(key as never);
  } catch {
    return source.charAt(0).toUpperCase() + source.slice(1);
  }
}

// Source badge colours map onto the design system signals. Meta gets the
// brand-blue, intranet the purple "enterprise" tint, manual / widget the
// neutral muted background. Coloured by source so the campaign list
// reads like a portfolio at a glance.
function sourceBadgeClass(source: string): string {
  switch (source) {
    case "meta":
    case "meta_test":
      return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
    case "intranet":
    case "partner_intranet":
      return "bg-[#ede9fe] text-[#6d28d9]";
    case "widget":
    case "form":
      return "bg-[#fff7ed] text-[#c2410c]";
    case "whatsapp":
      return "bg-[#dcfce7] text-[#166534]";
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-tertiary)]";
  }
}
