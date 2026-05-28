"use client";

import { useState } from "react";

import {
  createMailchimpAudience,
  CRMClientError,
  type MailchimpAudience,
} from "@/lib/crm/client";

import { Wizard } from "./wizard";
import { WizardField } from "./wizard-field";

type AudienceCreateModalProps = {
  companyId: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
  onClose: () => void;
  onCreated: (audience: MailchimpAudience) => void;
};

const COUNTRIES = [
  { code: "TR", label: "Türkiye" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "IE", label: "Ireland" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
];

const LANGUAGES = [
  { code: "tr", label: "Turkish" },
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
];

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// AudienceCreateModal — atomic wizard. Each step asks for one or two
// related fields with a clear label + helper. The flow loosely mirrors
// what Mailchimp's own Audience setup walks through, but every step
// is small enough that an operator can finish without thinking.
export function AudienceCreateModal({
  companyId,
  defaultFromName,
  defaultFromEmail,
  onClose,
  onCreated,
}: Readonly<AudienceCreateModalProps>) {
  const [name, setName] = useState("");
  const [permissionReminder, setPermissionReminder] = useState(
    "You're receiving this email because you signed up for our updates.",
  );
  const [company, setCompany] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("TR");
  const [fromName, setFromName] = useState(defaultFromName ?? "");
  const [fromEmail, setFromEmail] = useState(defaultFromEmail ?? "");
  const [language, setLanguage] = useState("tr");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const audience = await createMailchimpAudience(companyId, {
        name: name.trim(),
        contact: {
          company: company.trim(),
          address1: address1.trim(),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          country: country.trim(),
        },
        permission_reminder: permissionReminder.trim(),
        campaign_defaults: {
          from_name: fromName.trim(),
          from_email: fromEmail.trim(),
          subject: "",
          language,
        },
        email_type_option: false,
      });
      onCreated(audience);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to create the audience.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Wizard
      modalTitle="New audience"
      modalSubtitle="A short setup — one or two fields per step."
      onCancel={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Create audience"
      submittingLabel="Creating…"
      steps={[
        {
          key: "name",
          title: "Name the audience",
          description: "A label your team uses internally to find it.",
          isValid: () => name.trim().length > 0,
          body: (
            <WizardField
              label="Audience name"
              help="Subscribers never see this name. Pick something short and recognizable."
              example="Newsletter subscribers"
              required
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Newsletter subscribers"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "from-name",
          title: "Who sends the email?",
          description: "The display name your subscribers see in their inbox.",
          isValid: () => fromName.trim().length > 0,
          body: (
            <WizardField
              label="From name"
              help="Shows up in the From field of every email sent to this audience. You can override it per campaign."
              example="Lisent Team"
              required
            >
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Lisent Team"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "from-email",
          title: "Default reply-to email",
          description: "Where replies land when subscribers hit Reply.",
          isValid: () => fromEmail.trim().length > 0 && fromEmail.includes("@"),
          body: (
            <WizardField
              label="Reply-to email"
              help="Use an inbox you actually check. Mailchimp may not let you send from unverified domains."
              example="hello@yourdomain.com"
              required
            >
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="hello@yourdomain.com"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "language",
          title: "List language",
          description:
            "Mailchimp uses this to localize their hosted opt-in / unsubscribe pages.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Language"
              help="Pick the primary language your subscribers speak."
            >
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
                autoFocus
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </WizardField>
          ),
        },
        {
          key: "company",
          title: "Your company or organization name",
          description:
            "Required by CAN-SPAM. Shown at the bottom of every email.",
          isValid: () => company.trim().length > 0,
          body: (
            <WizardField
              label="Company / organization"
              help="The legal name that identifies the sender on every email footer."
              example="Lisent AI"
              required
            >
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Lisent AI"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "street",
          title: "Street address",
          description: "Part of the postal address Mailchimp prints in the footer.",
          isValid: () => address1.trim().length > 0,
          body: (
            <WizardField
              label="Street address"
              help="Street name and number. Apartment or unit goes here too if relevant."
              example="Atatürk Cad. No:12"
              required
            >
              <input
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="123 Main Street"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "city",
          title: "City and state / region",
          description: "City is required; state is optional in some countries.",
          isValid: () => city.trim().length > 0,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label="City"
                help="The city or town."
                example="Istanbul"
                required
              >
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Istanbul"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField
                label="State / region"
                help="Province, state or region (optional)."
                example="Kadıköy"
              >
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State / region"
                  className={inputClass}
                />
              </WizardField>
            </div>
          ),
        },
        {
          key: "zip-country",
          title: "ZIP code and country",
          description: "Last bits of the postal address.",
          isValid: () => country.trim().length > 0,
          body: (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WizardField
                label="ZIP / postal code"
                help="Optional in some countries."
                example="34710"
              >
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP / postal code"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
              <WizardField label="Country" help="Pick from the list." required>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={inputClass}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </WizardField>
            </div>
          ),
        },
        {
          key: "permission",
          title: "Permission reminder",
          description:
            "A short line shown in every email footer reminding subscribers why they got it.",
          isValid: () => true,
          alwaysComplete: true,
          body: (
            <WizardField
              label="Permission reminder"
              help="Mailchimp requires this for compliance. Default is fine if you're not sure."
              example="You're receiving this because you signed up for our updates."
            >
              <textarea
                value={permissionReminder}
                onChange={(e) => setPermissionReminder(e.target.value)}
                rows={3}
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
      ]}
    />
  );
}
