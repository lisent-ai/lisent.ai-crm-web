"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

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
    "Bu emaili aldınız çünkü güncellemelerimize abone oldunuz.",
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
      modalTitle="✨ Yeni audience oluştur"
      modalSubtitle="3 hızlı adım — sonra abone toplamaya başlayabilirsin"
      onCancel={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="✓ Audience'ı oluştur"
      submittingLabel="Oluşturuluyor…"
      steps={[
        {
          key: "name",
          title: "Bu liste için bir ad seç",
          description:
            "Operatörler bu adı kampanya gönderirken görür. Kısa ve tanınabilir bir şey seç.",
          isValid: () => name.trim().length > 0,
          body: (
            <WizardField
              icon="📛"
              label="Audience adı"
              help="Sadece sen ve takımın görür — abonelere gözükmez."
              example="Bülten aboneleri"
              required
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bülten aboneleri"
                className={inputClass}
                autoFocus
              />
            </WizardField>
          ),
        },
        {
          key: "sender",
          title: "Bu listeden gönderilen emaillerin görünür kimliği",
          description:
            "Hangi isim + email gönderen olarak gözüksün? Tek tek kampanyada değiştirebilirsin.",
          isValid: () =>
            fromName.trim().length > 0 && fromEmail.trim().length > 0,
          body: (
            <div className="flex flex-col gap-5">
              <WizardField
                icon="👤"
                label="Gönderen adı"
                help="Alıcının inbox'ında 'Kimden:' satırında görünür."
                example="Lisent Ekibi"
                required
              >
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Lisent Ekibi"
                  className={inputClass}
                />
              </WizardField>
              <WizardField
                icon="📧"
                label="Gönderen email adresi"
                help="Alıcı 'Yanıtla' butonuna bastığında bu adrese cevap gider. Mailchimp doğrulanmamış domain'lerden gönderim yapmana izin vermeyebilir."
                example="bulten@lisent.ai"
                required
              >
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="bulten@lisent.ai"
                  className={inputClass}
                />
              </WizardField>
              <WizardField
                icon="🏷️"
                label="Default email konusu (opsiyonel)"
                help="Bu listeye yeni kampanya açtığında konu satırı otomatik bununla doldurulur."
                example="Lisent'ten haftalık güncelleme"
              >
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="(boş bırakırsan her kampanyada elle yazarsın)"
                  className={inputClass}
                />
              </WizardField>
              <WizardField
                icon="🌍"
                label="Liste dili"
                help="Mailchimp bazı formları (örn. onay sayfası) bu dile çevirir."
              >
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={inputClass}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </WizardField>
            </div>
          ),
        },
        {
          key: "address",
          title: "Posta adresi — yasal zorunluluk",
          description:
            "Mailchimp + CAN-SPAM kanunu her email'in altına bir fiziksel adres koymanı gerektiriyor. Şirketinin / firmanın gerçek adresini gir.",
          isValid: () =>
            company.trim().length > 0 &&
            address1.trim().length > 0 &&
            city.trim().length > 0 &&
            country.trim().length > 0,
          body: (
            <div className="flex flex-col gap-5">
              <WizardField
                icon="🏢"
                label="Şirket / organizasyon adı"
                help="Email'in altında 'Kimden gönderildi' kısmında görünür."
                example="Lisent AI"
                required
              >
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Lisent AI"
                  className={inputClass}
                />
              </WizardField>
              <WizardField
                icon="🛣️"
                label="Sokak adresi"
                help="Sokak adı + numara. İlçe / mahalle dahil."
                example="Atatürk Cad. No:12"
                required
              >
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Atatürk Cad. No:12"
                  className={inputClass}
                />
              </WizardField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <WizardField icon="🏙️" label="Şehir" example="İstanbul" required>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="İstanbul"
                    className={inputClass}
                  />
                </WizardField>
                <WizardField icon="🗺️" label="İl / bölge" example="Kadıköy">
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Kadıköy"
                    className={inputClass}
                  />
                </WizardField>
                <WizardField icon="📮" label="Posta kodu" example="34710">
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="34710"
                    className={inputClass}
                  />
                </WizardField>
                <WizardField icon="🌐" label="Ülke" required>
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
              <details className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                  ⚙️ Daha fazla seçenek (izin hatırlatması)
                </summary>
                <div className="mt-3">
                  <WizardField
                    icon="💬"
                    label="İzin hatırlatması"
                    help="Email'in altında 'Bu emaili neden alıyorum?' açıklaması olarak gözükür. CAN-SPAM uyumluluğu için Mailchimp ister."
                    example="Bültenimize abone olduğunuz için bu emaili aldınız."
                  >
                    <textarea
                      value={permissionReminder}
                      onChange={(e) => setPermissionReminder(e.target.value)}
                      rows={2}
                      className={inputClass}
                    />
                  </WizardField>
                </div>
              </details>
            </div>
          ),
        },
      ]}
    />
  );
}
