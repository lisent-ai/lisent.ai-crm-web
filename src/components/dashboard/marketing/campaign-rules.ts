import {
  updateCompanyExtraData,
  updateLead,
  type Company,
  type Lead,
} from "@/lib/crm/client";

// One campaign -> rep mapping. Mirrors the Go struct in
// internal/leads/campaign_assign.go (label is frontend-only display).
export type CampaignAssignRule = { user_id: string; user_name: string; label?: string };
export type CampaignAssignRules = Record<string, CampaignAssignRule>;

export const CAMPAIGN_RULES_KEY = "campaign_assignment_rules";

// Keep in sync with the Go leadCampaignKey (internal/leads/campaign_assign.go)
// so a rule keyed in the UI matches a lead auto-assigned server-side at
// ingestion: source:campaignId -> source:campaignName -> source:_default.
export function leadCampaignKey(lead: Pick<Lead, "extraData" | "source">): string {
  const extra = (lead.extraData ?? {}) as Record<string, unknown>;
  const campaignId =
    typeof extra.campaign_id === "string" && extra.campaign_id ? extra.campaign_id : null;
  const campaignName =
    typeof extra.campaign_name === "string" && extra.campaign_name ? extra.campaign_name : null;
  const source = lead.source || "manual";
  return campaignId
    ? `${source}:${campaignId}`
    : campaignName
      ? `${source}:${campaignName}`
      : `${source}:_default`;
}

// Human-readable campaign label (campaign name, else source, else "manual").
export function campaignLabelForLead(lead: Pick<Lead, "extraData" | "source">): string {
  const extra = (lead.extraData ?? {}) as Record<string, unknown>;
  const campaignName =
    typeof extra.campaign_name === "string" && extra.campaign_name ? extra.campaign_name : null;
  return campaignName ?? (lead.source || "").trim() ?? "manual";
}

// True when the lead carries something specific enough to key a rule on
// (a real campaign or a non-empty source) — vs. the generic manual default,
// for which an "auto-assign everything" rule would be too broad.
export function leadHasCampaign(lead: Pick<Lead, "extraData" | "source">): boolean {
  const extra = (lead.extraData ?? {}) as Record<string, unknown>;
  const hasCampaign =
    (typeof extra.campaign_id === "string" && extra.campaign_id.trim() !== "") ||
    (typeof extra.campaign_name === "string" && extra.campaign_name.trim() !== "");
  return hasCampaign || (lead.source || "").trim() !== "";
}

export function parseCampaignRules(raw: string | undefined): CampaignAssignRules {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as CampaignAssignRules) : {};
  } catch {
    return {};
  }
}

// Persists a campaign -> rep rule on the company and retroactively assigns
// existing UNASSIGNED leads from that campaign. Returns the updated company
// and how many leads were backfilled. Per-lead assignment is best-effort.
export async function saveCampaignRuleAndBackfill(input: {
  company: Company;
  campaignKey: string;
  label: string;
  userId: string;
  userName: string;
  leads: readonly Lead[];
}): Promise<{ company: Company; assigned: number }> {
  const rules = parseCampaignRules(input.company.extraData?.[CAMPAIGN_RULES_KEY]);
  const next: CampaignAssignRules = {
    ...rules,
    [input.campaignKey]: {
      user_id: input.userId,
      user_name: input.userName,
      label: input.label,
    },
  };

  const company = await updateCompanyExtraData(input.company.id, {
    ...input.company.extraData,
    [CAMPAIGN_RULES_KEY]: JSON.stringify(next),
  });

  const targets = input.leads.filter(
    (lead) => !lead.assigneeUserId?.trim() && leadCampaignKey(lead) === input.campaignKey,
  );
  let assigned = 0;
  for (const lead of targets) {
    try {
      await updateLead(lead.id, {
        assigneeUserId: input.userId,
        assigneeUserName: input.userName,
        assignmentMethod: "manual",
      });
      assigned += 1;
    } catch {
      // best-effort per lead; keep going
    }
  }

  return { company, assigned };
}
