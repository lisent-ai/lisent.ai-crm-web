import { type AvailableField, type StepId, type StepMeta } from "./import-types";

export const defaultAvailableFields: AvailableField[] = [
  { name: "name", description: "Full display name for the customer.", descriptionKey: "imports.fields.name" },
  { name: "first_name", description: "Given name of the customer.", descriptionKey: "imports.fields.firstName" },
  { name: "last_name", description: "Family name of the customer.", descriptionKey: "imports.fields.lastName" },
  { name: "email", description: "Primary email address.", descriptionKey: "imports.fields.email" },
  { name: "phone", description: "Primary phone number.", descriptionKey: "imports.fields.phone" },
  { name: "preferred_language", description: "Language code such as tr or en.", descriptionKey: "imports.fields.preferredLanguage" },
  { name: "country_code", description: "Country code such as TR or DE.", descriptionKey: "imports.fields.countryCode" },
  { name: "subscription_date", description: "Signup or subscription date.", descriptionKey: "imports.fields.subscriptionDate" },
  { name: "external_customer_id", description: "Source system identifier.", descriptionKey: "imports.fields.externalCustomerId" },
];

export const steps: StepMeta[] = [
  {
    id: "source",
    stepNumber: "01",
    label: "Source",
    title: "Select the CSV source",
    summary: "Upload a CSV file or paste a direct CSV export URL.",
    labelKey: "imports.steps.source.label",
    titleKey: "imports.steps.source.title",
    summaryKey: "imports.steps.source.summary",
  },
  {
    id: "preview",
    stepNumber: "02",
    label: "Preview",
    title: "Inspect parsed headers and sample rows",
    summary: "Confirm the structure before mapping any fields.",
    labelKey: "imports.steps.preview.label",
    titleKey: "imports.steps.preview.title",
    summaryKey: "imports.steps.preview.summary",
  },
  {
    id: "mapping",
    stepNumber: "03",
    label: "Mapping",
    title: "Review and approve field suggestions",
    summary: "Approve mapping, then continue to the company customer directory.",
    labelKey: "imports.steps.mapping.label",
    titleKey: "imports.steps.mapping.title",
    summaryKey: "imports.steps.mapping.summary",
  },
];

export const stepSequence: StepId[] = ["source", "preview", "mapping"];
