"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CRMClientError, listLeads, type Lead } from "@/lib/crm/client";

import { CampaignCard, type CampaignSummary } from "./campaign-card";

// CampaignsOverview is the read-side of the Marketing module — it never
// writes to the CRM. Source of truth is each lead's `origin_system` +
// `extra_data` (campaign_id / campaign_name / ad_id / form_id), so we
// don't need a dedicated `campaigns` table; the same data the leads list
// already returns is enough to attribute leads to campaigns and compute
// lightweight KPIs (count, qualified count, last lead time).
//
// At >1k leads/day this client-side aggregation gets expensive — at that
// point swap in a server endpoint (`GET /companies/:id/marketing/campaigns`)
// that pre-aggregates. Defer until the volume is real.
export function CampaignsOverview() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";
  const companyName = searchParams.get("companyName")?.trim() ?? "";

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLeads(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    listLeads(companyId)
      .then((rows) => {
        if (!cancelled) setLeads(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.campaigns.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const campaigns = useMemo<CampaignSummary[]>(() => {
    if (!leads) return [];
    return groupLeadsByCampaign(leads);
  }, [leads]);

  const totals = useMemo(() => {
    if (!leads) return { total: 0, qualified: 0, conversion: 0 };
    const qualified = leads.filter((l) => l.aiStatus === "qualified" || l.status === "qualified")
      .length;
    return {
      total: leads.length,
      qualified,
      conversion: leads.length === 0 ? 0 : Math.round((qualified / leads.length) * 100),
    };
  }, [leads]);

  if (!companyId) {
    return (
      <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] p-8 text-sm text-[var(--text-secondary)]">
        {t("marketing.campaigns.pickWorkspace")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label={t("marketing.campaigns.kpiAria")}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <KpiCard
          label={t("marketing.campaigns.kpiTotalLeads")}
          value={totals.total}
        />
        <KpiCard
          label={t("marketing.campaigns.kpiQualified")}
          value={totals.qualified}
        />
        <KpiCard
          label={t("marketing.campaigns.kpiConversion")}
          value={`${totals.conversion}%`}
        />
      </section>

      {loading && (
        <p className="text-sm text-[var(--text-tertiary)]">
          {t("marketing.campaigns.loading")}
        </p>
      )}
      {errorMessage && (
        <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </p>
      )}

      {!loading && !errorMessage && campaigns.length === 0 && (
        <div className="rounded-[var(--radius-card-lg)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] p-8 text-sm text-[var(--text-secondary)]">
          {t("marketing.campaigns.empty")}
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              campaign={c}
              companyId={companyId}
              companyName={companyName}
              key={c.key}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

// groupLeadsByCampaign collapses leads into campaign rows. Grouping key
// preference order:
//   1. extra_data.campaign_id (Meta — most specific)
//   2. extra_data.campaign_name (Meta when id is missing)
//   3. source (everything else: intranet, widget, manual, etc.)
//
// We use the source-prefixed key so a "manual" group from the form widget
// doesn't collide with an "intranet" group with the same name.
function groupLeadsByCampaign(leads: Lead[]): CampaignSummary[] {
  type Bucket = {
    key: string;
    source: string;
    campaignId: string | null;
    campaignName: string;
    formName: string | null;
    leads: Lead[];
  };
  const map = new Map<string, Bucket>();

  for (const lead of leads) {
    const extra = (lead.extraData ?? {}) as Record<string, unknown>;
    const campaignId =
      typeof extra.campaign_id === "string" && extra.campaign_id ? extra.campaign_id : null;
    const campaignName =
      typeof extra.campaign_name === "string" && extra.campaign_name
        ? extra.campaign_name
        : null;
    const formName =
      typeof extra.form_name === "string" && extra.form_name ? extra.form_name : null;
    const source = lead.source || "manual";

    const key = campaignId
      ? `${source}:${campaignId}`
      : campaignName
        ? `${source}:${campaignName}`
        : `${source}:_default`;

    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        source,
        campaignId,
        campaignName: campaignName ?? source,
        formName,
        leads: [],
      };
      map.set(key, bucket);
    }
    bucket.leads.push(lead);
  }

  return Array.from(map.values())
    .map((b) => ({
      key: b.key,
      source: b.source,
      campaignId: b.campaignId,
      campaignName: b.campaignName,
      formName: b.formName,
      totalLeads: b.leads.length,
      qualifiedLeads: b.leads.filter(
        (l) => l.aiStatus === "qualified" || l.status === "qualified",
      ).length,
      lastLeadAt: b.leads.reduce<string | null>((acc, l) => {
        if (!acc) return l.createdAt;
        return l.createdAt > acc ? l.createdAt : acc;
      }, null),
    }))
    .sort((a, b) => b.totalLeads - a.totalLeads);
}
