import { type AvailableField, type StepId, type StepMeta } from "./import-types";

export const defaultAvailableFields: AvailableField[] = [
  { name: "name", description: "Full display name for the customer." },
  { name: "first_name", description: "Given name of the customer." },
  { name: "last_name", description: "Family name of the customer." },
  { name: "email", description: "Primary email address." },
  { name: "phone", description: "Primary phone number." },
  { name: "preferred_language", description: "Language code such as tr or en." },
  { name: "country_code", description: "Country code such as TR or DE." },
  { name: "subscription_date", description: "Signup or subscription date." },
  { name: "external_customer_id", description: "Source system identifier." },
];

export const steps: StepMeta[] = [
  {
    id: "source",
    stepNumber: "01",
    label: "Source",
    title: "Select the CSV source",
    summary: "Upload a CSV file or paste a direct CSV export URL.",
  },
  {
    id: "preview",
    stepNumber: "02",
    label: "Preview",
    title: "Inspect parsed headers and sample rows",
    summary: "Confirm the structure before mapping any fields.",
  },
  {
    id: "mapping",
    stepNumber: "03",
    label: "Mapping",
    title: "Review and approve field suggestions",
    summary: "Approve mapping, then continue to the company customer directory.",
  },
];

export const stepSequence: StepId[] = ["source", "preview", "mapping"];
