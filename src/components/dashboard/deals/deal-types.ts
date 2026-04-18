import type { Deal, DealStage } from "@/lib/crm/client";

export const dealStages: Array<{
  value: DealStage;
  label: string;
  description: string;
}> = [
  { value: "new", label: "New", description: "Fresh opportunity created" },
  { value: "qualified", label: "Qualified", description: "Opportunity confirmed as serious" },
  { value: "proposal", label: "Proposal", description: "Proposal shared with the buyer" },
  { value: "negotiation", label: "Negotiation", description: "Commercial terms are being discussed" },
  { value: "won", label: "Won", description: "Sale successfully closed" },
  { value: "lost", label: "Lost", description: "Opportunity was not won" },
];

export const supportedDealCurrencies = ["EUR", "USD", "GBP", "TRY"] as const;

export type DealFormState = {
  customerId: string;
  sourceLeadId: string;
  name: string;
  stage: DealStage;
  amount: string;
  currency: string;
  closeDate: string;
  terminationDate: string;
  wonReason: string;
  lossReason: string;
  assigneeUserId: string;
  assigneeUserName: string;
};

export const emptyDealForm: DealFormState = {
  customerId: "",
  sourceLeadId: "",
  name: "",
  stage: "new",
  amount: "0",
  currency: "EUR",
  closeDate: "",
  terminationDate: "",
  wonReason: "",
  lossReason: "",
  assigneeUserId: "",
  assigneeUserName: "",
};

function normalizeDateInputValue(value: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function buildDealForm(deal: Deal): DealFormState {
  return {
    customerId: deal.customerId,
    sourceLeadId: deal.sourceLeadId,
    name: deal.name,
    stage: deal.stage,
    amount: String(deal.amount ?? 0),
    currency: deal.currency || "EUR",
    closeDate: normalizeDateInputValue(deal.closeDate),
    terminationDate: normalizeDateInputValue(deal.terminationDate),
    wonReason: deal.wonReason,
    lossReason: deal.lossReason,
    assigneeUserId: deal.assigneeUserId,
    assigneeUserName: deal.assigneeUserName,
  };
}
