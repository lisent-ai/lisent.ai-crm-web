import type { Lead, LeadAssignmentMethod, LeadStatus } from "@/lib/crm/client";

export const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "lost",
  "converted",
];

export const dealStages = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

// Inline follow-up presets shown after a lead is marked "contacted".
// Selecting one drops a scheduled call on the calendar (and surfaces in
// the dashboard "today's calls" panel). "" = no follow-up.
export type FollowUpPreset =
  | ""
  | "tomorrow"
  | "in_2_days"
  | "in_1_week"
  | "in_1_month"
  | "custom";

export const followUpPresets: Exclude<FollowUpPreset, "">[] = [
  "tomorrow",
  "in_2_days",
  "in_1_week",
  "in_1_month",
  "custom",
];

export type LeadFormState = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  status: LeadStatus;
  source: string;
  assigneeUserId: string;
  assigneeUserName: string;
  assignmentMethod: LeadAssignmentMethod;
  value: string;
  followUpPreset: FollowUpPreset;
  // datetime-local value (YYYY-MM-DDTHH:mm) used when followUpPreset === "custom".
  followUpAt: string;
  // When editing a lead that came from a campaign, ticking this also creates a
  // campaign -> rep auto-assign rule (and backfills existing unassigned leads).
  autoAssignCampaign: boolean;
};

export type LeadConvertState = {
  name: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  countryCode: string;
  createDeal: boolean;
  dealStage: string;
  dealAmount: string;
  dealCloseDate: string;
};

export const emptyLeadForm: LeadFormState = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  status: "new",
  source: "",
  assigneeUserId: "",
  assigneeUserName: "",
  assignmentMethod: "manual",
  value: "0",
  followUpPreset: "",
  followUpAt: "",
  autoAssignCampaign: false,
};

export function buildLeadForm(lead: Lead): LeadFormState {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    notes: lead.notes,
    status: lead.status,
    source: lead.source,
    assigneeUserId: lead.assigneeUserId,
    assigneeUserName: lead.assigneeUserName,
    assignmentMethod: lead.assignmentMethod,
    value: String(lead.value || 0),
    followUpPreset: "",
    followUpAt: "",
    autoAssignCampaign: false,
  };
}

export function buildConvertState(lead: Lead): LeadConvertState {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    preferredLanguage: "en",
    countryCode: "",
    createDeal: true,
    dealStage: "new",
    dealAmount: String(lead.value || 0),
    dealCloseDate: "",
  };
}
