"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Megaphone, Trash2, UserCheck } from "lucide-react";

import { getAccountProfile } from "@/lib/account/client";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { hasCompanyPermissionInAccess } from "@/lib/auth/access-control";
import {
  CompanyMembershipClientError,
  listCompanyMembers,
  type CompanyMember,
} from "@/lib/auth/company-membership-client";
import {
  CRMClientError,
  listCompanies,
  listLeads,
  updateCompanyExtraData,
  type Company,
  type Lead,
} from "@/lib/crm/client";
import { SelectField } from "@/components/dashboard/leads/lead-form-fields";

import {
  CAMPAIGN_RULES_KEY,
  campaignLabelForLead,
  leadCampaignKey,
  parseCampaignRules,
  saveCampaignRuleAndBackfill,
  type CampaignAssignRules,
} from "./campaign-rules";

export function CampaignAutoAssign() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company")?.trim() ?? "";

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formCampaignKey, setFormCampaignKey] = useState("");
  const [formAssignee, setFormAssignee] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getAccountProfile()
      .then((next) => {
        if (!cancelled) setAccount(next);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!companyId) {
      setCompany(null);
      setLeads([]);
      setMembers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    Promise.all([
      listCompanies(),
      listLeads(companyId),
      listCompanyMembers(companyId).catch((error) => {
        if (error instanceof CompanyMembershipClientError) return [] as CompanyMember[];
        throw error;
      }),
    ])
      .then(([companies, leadRows, memberRows]) => {
        if (cancelled) return;
        setCompany(companies.find((c) => c.id === companyId) ?? null);
        setLeads(leadRows);
        setMembers(memberRows);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(
          error instanceof CRMClientError ? error.message : t("campaignAssign.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const canManage = useMemo(
    () =>
      account && companyId
        ? hasCompanyPermissionInAccess(account.access, companyId, "integrations.manage")
        : false,
    [account, companyId],
  );

  const rules = useMemo<CampaignAssignRules>(
    () => parseCampaignRules(company?.extraData?.[CAMPAIGN_RULES_KEY]),
    [company],
  );

  // Distinct campaigns derived from leads, keyed identically to
  // leadCampaignKey / the Go side. label falls back to the source.
  const campaignOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const lead of leads) {
      const key = leadCampaignKey(lead);
      const label = campaignLabelForLead(lead);
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { key, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [leads]);

  const assignableMembers = useMemo(
    () =>
      members
        .filter((member) => member.role !== "viewer")
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [members],
  );

  async function persistRules(next: CampaignAssignRules): Promise<Company | null> {
    if (!company) return null;
    const updated = await updateCompanyExtraData(company.id, {
      ...company.extraData,
      [CAMPAIGN_RULES_KEY]: JSON.stringify(next),
    });
    setCompany(updated);
    return updated;
  }

  async function handleSave() {
    if (!company || !formCampaignKey || !formAssignee) return;
    const member = assignableMembers.find((m) => m.userId === formAssignee);
    if (!member) return;
    const campaign = campaignOptions.find((c) => c.key === formCampaignKey);

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { company: updated, assigned } = await saveCampaignRuleAndBackfill({
        company,
        campaignKey: formCampaignKey,
        label: campaign?.label ?? formCampaignKey,
        userId: member.userId,
        userName: member.displayName,
        leads,
      });
      setCompany(updated);

      // Reflect the retroactively assigned leads in the panel's own list.
      if (assigned > 0) {
        const fresh = await listLeads(company.id).catch(() => leads);
        setLeads(fresh);
      }

      setFormCampaignKey("");
      setFormAssignee("");
      setSuccessMessage(t("campaignAssign.saved", { count: assigned }));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("campaignAssign.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(key: string) {
    if (!company) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const next = { ...rules };
      delete next[key];
      await persistRules(next);
      setSuccessMessage(t("campaignAssign.deleted"));
    } catch (error) {
      setErrorMessage(
        error instanceof CRMClientError ? error.message : t("campaignAssign.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!companyId) return null;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-secondary)]">
          <Megaphone aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("campaignAssign.title")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("campaignAssign.description")}
          </p>
        </div>
      </header>

      {!canManage ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
          {t("campaignAssign.restricted")}
        </p>
      ) : (
        <>
          {errorMessage ? (
            <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-red)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,_var(--signal-green)_30%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
              {successMessage}
            </div>
          ) : null}

          {/* Existing rules */}
          {Object.keys(rules).length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">{t("campaignAssign.noRules")}</p>
          ) : (
            <ul className="grid gap-2">
              {Object.entries(rules).map(([key, rule]) => (
                <li
                  className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3"
                  key={key}
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                    <Megaphone aria-hidden="true" className="h-4 w-4 text-[var(--text-tertiary)]" />
                    {rule.label || key}
                  </span>
                  <span className="text-[var(--text-tertiary)]">→</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                    <UserCheck aria-hidden="true" className="h-4 w-4 text-[var(--text-tertiary)]" />
                    {rule.user_name || rule.user_id}
                  </span>
                  <button
                    className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    disabled={saving}
                    onClick={() => void handleDelete(key)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    {t("campaignAssign.delete")}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add / update rule */}
          {campaignOptions.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              {loading ? t("campaignAssign.loading") : t("campaignAssign.noCampaigns")}
            </p>
          ) : (
            <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <SelectField
                label={t("campaignAssign.campaignLabel")}
                onChange={setFormCampaignKey}
                options={[
                  { label: t("campaignAssign.selectCampaign"), value: "" },
                  ...campaignOptions.map((c) => ({
                    label: `${c.label} · ${c.count}`,
                    value: c.key,
                  })),
                ]}
                value={formCampaignKey}
              />
              <SelectField
                label={t("campaignAssign.assigneeLabel")}
                onChange={setFormAssignee}
                options={[
                  { label: t("campaignAssign.selectAssignee"), value: "" },
                  ...assignableMembers.map((m) => ({ label: m.displayName, value: m.userId })),
                ]}
                value={formAssignee}
              />
              <button
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
                disabled={saving || !formCampaignKey || !formAssignee}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? t("campaignAssign.saving") : t("campaignAssign.add")}
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
