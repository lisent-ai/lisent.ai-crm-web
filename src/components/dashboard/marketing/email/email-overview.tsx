"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  listMailchimpAudiences,
  listMailchimpCampaigns,
  listMailchimpReports,
  type MailchimpAudience,
  type MailchimpCampaign,
  type MailchimpReport,
} from "@/lib/crm/client";

type EmailOverviewProps = {
  companyId: string;
};

type Stats = {
  audiences: MailchimpAudience[];
  campaigns: MailchimpCampaign[];
  reports: MailchimpReport[];
};

// EmailOverview is the operator's home base for the email module —
// quick KPIs + recent activity + quick action cards. Three parallel
// fetches feed the page; failures fall back to placeholders so the
// dashboard always renders something useful instead of an error wall.
export function EmailOverview({ companyId }: Readonly<EmailOverviewProps>) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  // baseQuery is everything in the URL EXCEPT tab + action — those get
  // re-appended per quick action below. Without stripping them, the
  // navigation produces ?tab=overview&tab=campaigns (duplicate), which
  // URLSearchParams.get("tab") resolves to the FIRST value (overview)
  // and the tab never actually changes.
  const queryWithoutTab = new URLSearchParams(searchParams.toString());
  queryWithoutTab.delete("tab");
  queryWithoutTab.delete("action");
  const baseQuery = queryWithoutTab.toString();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listMailchimpAudiences(companyId, { count: 100 }).catch(() => ({
        lists: [],
        total_items: 0,
      })),
      listMailchimpCampaigns(companyId, {
        count: 5,
        sort_field: "create_time",
        sort_dir: "DESC",
      }).catch(() => ({ campaigns: [], total_items: 0 })),
      listMailchimpReports(companyId, { count: 5 }).catch(() => ({
        reports: [],
        total_items: 0,
      })),
    ])
      .then(([audRes, campRes, repRes]) => {
        if (cancelled) return;
        setStats({
          audiences: audRes.lists ?? [],
          campaigns: campRes.campaigns ?? [],
          reports: repRes.reports ?? [],
        });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.overview.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  if (loading) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        {t("marketing.email.overview.loading")}
      </article>
    );
  }

  if (!stats) {
    return (
      <article className="rounded-3xl border border-[var(--signal-red)] bg-[var(--surface)] p-6 text-sm text-[var(--signal-red)]">
        {error}
      </article>
    );
  }

  // Aggregate KPIs from the fetched data.
  const totalAudiences = stats.audiences.length;
  const totalSubscribers = stats.audiences.reduce(
    (sum, a) => sum + (a.stats?.member_count ?? 0),
    0,
  );
  const sentCampaigns = stats.campaigns.filter((c) => c.status === "sent").length;
  const avgOpenRate =
    stats.reports.length > 0
      ? stats.reports
          .map((r) => r.opens?.open_rate ?? 0)
          .reduce((a, b) => a + b, 0) / stats.reports.length
      : null;
  const avgClickRate =
    stats.reports.length > 0
      ? stats.reports
          .map((r) => r.clicks?.click_rate ?? 0)
          .reduce((a, b) => a + b, 0) / stats.reports.length
      : null;

  const tabHref = (tab: string) =>
    `/dashboard/marketing/email?${baseQuery ? `${baseQuery}&` : ""}tab=${tab}`;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI
          label={t("marketing.email.overview.kpi.audiences")}
          value={totalAudiences.toLocaleString()}
          href={tabHref("audiences")}
        />
        <KPI
          label={t("marketing.email.overview.kpi.subscribers")}
          value={totalSubscribers.toLocaleString()}
          href={tabHref("audiences")}
        />
        <KPI
          label={t("marketing.email.overview.kpi.sentCampaigns")}
          value={sentCampaigns.toLocaleString()}
          href={tabHref("campaigns")}
        />
        <KPI
          label={t("marketing.email.overview.kpi.openRate")}
          value={
            avgOpenRate !== null ? `${(avgOpenRate * 100).toFixed(1)}%` : "—"
          }
          sub={
            avgClickRate !== null
              ? t("marketing.email.overview.kpi.clickRateSub", {
                  rate: (avgClickRate * 100).toFixed(1),
                })
              : undefined
          }
          href={tabHref("reports")}
        />
      </section>

      {/* Quick actions — each navigates with ?action=new so the
         destination tab's list component auto-opens its create modal. */}
      <section>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
          {t("marketing.email.overview.quickActionsTitle")}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            label={t("marketing.email.overview.actions.newCampaign")}
            href={`${tabHref("campaigns")}&action=new`}
            icon="✉️"
            primary
          />
          <QuickAction
            label={t("marketing.email.overview.actions.newAudience")}
            href={`${tabHref("audiences")}&action=new`}
            icon="👥"
          />
          <QuickAction
            label={t("marketing.email.overview.actions.newTemplate")}
            href={`${tabHref("templates")}&action=new`}
            icon="📄"
          />
          <QuickAction
            label={t("marketing.email.overview.actions.reports")}
            href={tabHref("reports")}
            icon="📊"
          />
        </div>
      </section>

      {/* Recent campaigns + recent reports side-by-side */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
          <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("marketing.email.overview.recentCampaigns")}
            </h3>
            <Link href={tabHref("campaigns")} className="text-xs text-[var(--accent)] hover:underline">
              {t("marketing.email.overview.viewAll")}
            </Link>
          </header>
          {stats.campaigns.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-[var(--text-tertiary)]">
              {t("marketing.email.overview.noCampaigns")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {stats.campaigns.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--text-primary)]">
                      {c.settings?.subject_line ?? c.settings?.title ?? c.id}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {c.recipients?.list_name ?? "—"} ·{" "}
                      {c.create_time
                        ? new Date(c.create_time).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <StatusChip status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)]">
          <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {t("marketing.email.overview.recentReports")}
            </h3>
            <Link href={tabHref("reports")} className="text-xs text-[var(--accent)] hover:underline">
              {t("marketing.email.overview.viewAll")}
            </Link>
          </header>
          {stats.reports.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-[var(--text-tertiary)]">
              {t("marketing.email.overview.noReports")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {stats.reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--text-primary)]">
                      {r.subject_line ?? r.campaign_title ?? r.id}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {r.emails_sent?.toLocaleString() ?? 0}{" "}
                      {t("marketing.email.overview.recipients")} ·{" "}
                      {typeof r.opens?.open_rate === "number"
                        ? `${(r.opens.open_rate * 100).toFixed(1)}% open`
                        : "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {/* Empty-state hint when nothing happened yet */}
      {totalAudiences === 0 && stats.campaigns.length === 0 ? (
        <article className="rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-secondary)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t("marketing.email.overview.gettingStartedTitle")}
          </h3>
          <ol className="mx-auto mt-3 max-w-xl list-decimal space-y-1 text-left">
            <li>{t("marketing.email.overview.step1")}</li>
            <li>{t("marketing.email.overview.step2")}</li>
            <li>{t("marketing.email.overview.step3")}</li>
            <li>{t("marketing.email.overview.step4")}</li>
          </ol>
        </article>
      ) : null}
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  href,
}: Readonly<{ label: string; value: string; sub?: string; href: string }>) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)] hover:shadow-sm"
    >
      <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      <span className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{value}</span>
      {sub ? (
        <span className="mt-0.5 text-xs text-[var(--text-secondary)]">{sub}</span>
      ) : null}
    </Link>
  );
}

function QuickAction({
  label,
  href,
  icon,
  primary,
}: Readonly<{ label: string; href: string; icon: string; primary?: boolean }>) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-3xl border p-4 transition ${
        primary
          ? "border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
          : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)]"
      }`}
    >
      <span aria-hidden="true" className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function StatusChip({ status }: Readonly<{ status: string }>) {
  const color =
    status === "sent"
      ? "bg-[var(--signal-green-soft)] text-[var(--signal-green)]"
      : status === "sending" || status === "schedule"
        ? "bg-[var(--signal-amber-soft)] text-[var(--signal-amber)]"
        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
