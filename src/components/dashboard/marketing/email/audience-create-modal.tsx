"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  createMailchimpAudience,
  CRMClientError,
  type MailchimpAudience,
} from "@/lib/crm/client";

import { Wizard } from "./wizard";

type AudienceCreateModalProps = {
  companyId: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
  onClose: () => void;
  onCreated: (audience: MailchimpAudience) => void;
};

const COUNTRIES = [
  { code: "TR", label: "🇹🇷 Türkiye" },
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "IE", label: "🇮🇪 Ireland" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "NZ", label: "🇳🇿 New Zealand" },
  { code: "AE", label: "🇦🇪 UAE" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
];

const LANGUAGES = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

// AudienceCreateModal — 3-step wizard:
//   1. Name your audience
//   2. Postal address (CAN-SPAM)
//   3. Default sender + advanced
//
// Each step has a clear title + helper text so the operator never
// wonders what they're filling in. The Wizard component handles the
// step indicator + Back/Next + validation gating.
export function AudienceCreateModal({
  companyId,
  defaultFromName,
  defaultFromEmail,
  onClose,
  onCreated,
}: Readonly<AudienceCreateModalProps>) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [permissionReminder, setPermissionReminder] = useState(
    "You're receiving this email because you signed up for updates.",
  );
  const [company, setCompany] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("TR");
  const [fromName, setFromName] = useState(defaultFromName ?? "");
  const [fromEmail, setFromEmail] = useState(defaultFromEmail ?? "");
  const [subject, setSubject] = useState("");
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
          subject: subject.trim(),
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
            : t("marketing.email.audiences.create.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Wizard
      modalTitle={t("marketing.email.audiences.create.title")}
      modalSubtitle={t("marketing.email.audiences.create.body")}
      onCancel={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel={t("marketing.email.audiences.create.submit")}
      submittingLabel={t("marketing.email.audiences.create.creating")}
      steps={[
        {
          key: "name",
          title: t("marketing.email.audiences.create.step1Title"),
          description: t("marketing.email.audiences.create.step1Body"),
          isValid: () => name.trim().length > 0,
          body: (
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.audiences.create.fields.name")}{" "}
                <span className="text-[var(--signal-red)]">*</span>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("marketing.email.audiences.create.fields.namePlaceholder")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                autoFocus
              />
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.audiences.create.fields.nameHint")}
              </span>
            </label>
          ),
        },
        {
          key: "address",
          title: t("marketing.email.audiences.create.step2Title"),
          description: t("marketing.email.audiences.create.step2Body"),
          isValid: () =>
            company.trim().length > 0 &&
            address1.trim().length > 0 &&
            city.trim().length > 0 &&
            country.trim().length > 0,
          body: (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t("marketing.email.audiences.create.fields.company")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] sm:col-span-2"
              />
              <input
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder={t("marketing.email.audiences.create.fields.address")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] sm:col-span-2"
              />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("marketing.email.audiences.create.fields.city")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder={t("marketing.email.audiences.create.fields.state")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder={t("marketing.email.audiences.create.fields.zip")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ),
        },
        {
          key: "sender",
          title: t("marketing.email.audiences.create.step3Title"),
          description: t("marketing.email.audiences.create.step3Body"),
          isValid: () => fromName.trim().length > 0 && fromEmail.trim().length > 0,
          body: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    {t("marketing.email.audiences.create.fields.fromName")}{" "}
                    <span className="text-[var(--signal-red)]">*</span>
                  </span>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Lisent"
                    className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    {t("marketing.email.audiences.create.fields.fromEmail")}{" "}
                    <span className="text-[var(--signal-red)]">*</span>
                  </span>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="hello@yourdomain.com"
                    className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                </label>
              </div>

              <details className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                  {t("marketing.email.audiences.create.showAdvanced")}
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                      {t("marketing.email.audiences.create.fields.permissionReminder")}
                    </span>
                    <textarea
                      value={permissionReminder}
                      onChange={(e) => setPermissionReminder(e.target.value)}
                      rows={2}
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {t("marketing.email.audiences.create.fields.permissionReminderHint")}
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t("marketing.email.audiences.create.fields.defaultSubject")}
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>
            </div>
          ),
        },
      ]}
    />
  );
}
