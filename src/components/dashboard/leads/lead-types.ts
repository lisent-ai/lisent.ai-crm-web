import type { Lead, LeadAssignmentMethod, LeadStatus } from "@/lib/crm/client";

export const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
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
