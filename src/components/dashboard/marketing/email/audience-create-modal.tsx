"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  createMailchimpAudience,
  CRMClientError,
  type MailchimpAudience,
} from "@/lib/crm/client";

type AudienceCreateModalProps = {
  companyId: string;
  // Pre-fills the contact fields. The current Mailchimp config gives us
  // the operator's email + display name; pass them through so the
  // operator doesn't retype on every audience create.
  defaultFromName?: string;
  defaultFromEmail?: string;
  onClose: () => void;
  onCreated: (audience: MailchimpAudience) => void;
};

// AudienceCreateModal handles the Mailchimp "create audience" surface
// with sensible defaults so the operator only fills the 2-3 fields that
// actually vary per audience. Mailchimp requires a lot of metadata
// (CAN-SPAM-mandated postal address, permission reminder, default
// from address, campaign defaults) — most of which is the same across
// all of an operator's audiences. We hide the rest behind a single
// "More options" toggle.
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
  // Contact info — CAN-SPAM requires a postal address on every commercial
  // email; Mailchimp enforces this on audience create.
  const [company, setCompany] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  // ISO 3166-1 alpha-2 codes for the most common Mailchimp-sender
  // countries. Operators rarely need anything outside this set; if they
  // do, we can swap for a full list later.
  const [country, setCountry] = useState("TR");
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
  // Default campaign settings — Mailchimp pre-fills these on every new
  // campaign drawn from this audience, so getting them right once saves
  // typing in campaign-create later.
  const [fromName, setFromName] = useState(defaultFromName ?? "");
  const [fromEmail, setFromEmail] = useState(defaultFromEmail ?? "");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState("tr");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError(t("marketing.email.audiences.create.errNameRequired"));
      return;
    }
    if (!company.trim() || !address1.trim() || !city.trim() || !country.trim()) {
      setError(t("marketing.email.audiences.create.errAddressRequired"));
      return;
    }
    if (!fromName.trim() || !fromEmail.trim()) {
      setError(t("marketing.email.audiences.create.errFromRequired"));
      return;
    }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("marketing.email.audiences.create.title")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("marketing.email.audiences.create.body")}
          </p>
        </header>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {/* ── Essential: audience name */}
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.audiences.create.fields.name")}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("marketing.email.audiences.create.fields.namePlaceholder")}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            autoFocus
          />
        </label>

        {/* ── Required by CAN-SPAM / Mailchimp: company + postal address */}
        <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
          <legend className="px-1 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.audiences.create.contactSection")}
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        </fieldset>

        {/* ── Required by Mailchimp: default from name + email */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder={t("marketing.email.audiences.create.fields.fromName")}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder={t("marketing.email.audiences.create.fields.fromEmail")}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>

        {/* ── Advanced toggle: permission reminder + subject + language */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="self-start text-xs font-medium text-[var(--accent)] hover:underline"
        >
          {showAdvanced
            ? t("marketing.email.audiences.create.hideAdvanced")
            : t("marketing.email.audiences.create.showAdvanced")}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
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
        )}

        <footer className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            {t("integrations.mailchimp.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {submitting
              ? t("marketing.email.audiences.create.creating")
              : t("marketing.email.audiences.create.submit")}
          </button>
        </footer>
      </div>
    </div>
  );
}
