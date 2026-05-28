"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  createMailchimpCampaign,
  getMailchimpTemplate,
  listMailchimpAudiences,
  listMailchimpTemplates,
  setMailchimpCampaignContent,
  type MailchimpAudience,
  type MailchimpCampaign,
  type MailchimpTemplate,
} from "@/lib/crm/client";

import { ImagePickerModal } from "./image-picker-modal";
import { RichTextEditor } from "./rich-text-editor";
import { TemplatePreviewFrame } from "./template-preview-frame";
import { Wizard } from "./wizard";
import { WizardField } from "./wizard-field";

type CampaignCreateModalProps = {
  companyId: string;
  onClose: () => void;
  onCreated: (campaign: MailchimpCampaign) => void;
};

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// Type alias for the Mailchimp audience's documented campaign_defaults
// embed. We read from this to pre-fill the operator's sender + reply-to
// + default subject when an audience is chosen.
type CampaignDefaults = {
  from_name?: string;
  from_email?: string;
  subject?: string;
};

// CampaignCreateModal — guided 3-step wizard. The flow leans on the
// audience's stored campaign_defaults so the operator only has to type
// the subject line in 90% of cases.
export function CampaignCreateModal({
  companyId,
  onClose,
  onCreated,
}: Readonly<CampaignCreateModalProps>) {
  const t = useTranslations();
  const [audiences, setAudiences] = useState<MailchimpAudience[]>([]);
  const [templates, setTemplates] = useState<MailchimpTemplate[]>([]);
  const [audienceLoadError, setAudienceLoadError] = useState<string | null>(null);

  const [listId, setListId] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [html, setHtml] = useState(
    "<p>Merhaba {{FNAME|orada}},</p>\n<p>Mesajını buraya yaz.</p>",
  );
  const [templateId, setTemplateId] = useState<string>("");
  const [loadingTemplateBody, setLoadingTemplateBody] = useState(false);

  const [abTest, setAbTest] = useState(false);
  const [subjectB, setSubjectB] = useState("");
  const [fromNameB, setFromNameB] = useState("");
  const [winnerCriteria, setWinnerCriteria] = useState<
    "opens" | "clicks" | "manual"
  >("opens");
  const [testPercent, setTestPercent] = useState(25);
  const [waitHours, setWaitHours] = useState(4);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePicker, setImagePicker] = useState<{
    resolve: (url: string | null) => void;
  } | null>(null);
  const pickImage = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        setImagePicker({ resolve });
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listMailchimpAudiences(companyId, { count: 100 }),
      listMailchimpTemplates(companyId, { count: 100, type: "user" }).catch(() => ({
        templates: [],
        total_items: 0,
      })),
    ])
      .then(([audRes, tplRes]) => {
        if (cancelled) return;
        setAudiences(audRes.lists ?? []);
        setTemplates(tplRes.templates ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setAudienceLoadError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.audiences.loadFailed"),
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, t]);

  // When the operator picks an audience, pre-fill from name / reply-to
  // / subject from the audience's stored campaign_defaults so the
  // sender step is mostly already done. Mailchimp lets the operator
  // override per campaign — we just save typing.
  function pickAudience(audience: MailchimpAudience) {
    setListId(audience.id);
    const defs = (audience as { campaign_defaults?: CampaignDefaults })
      .campaign_defaults;
    if (defs) {
      if (defs.from_name && !fromName) setFromName(defs.from_name);
      if (defs.from_email && !replyTo) setReplyTo(defs.from_email);
      if (defs.subject && !subject) setSubject(defs.subject);
    }
  }

  async function applyTemplate(id: string) {
    setError(null);
    setTemplateId(id);
    if (!id) return;
    setLoadingTemplateBody(true);
    try {
      const tpl = await getMailchimpTemplate(companyId, id);
      const body =
        (tpl as { html?: string; source?: { html?: string } }).html ??
        (tpl as { source?: { html?: string } }).source?.html ??
        "";
      if (body) setHtml(body);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : t("marketing.email.templates.loadFailed"),
      );
    } finally {
      setLoadingTemplateBody(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const variateSettings = abTest
        ? {
            winner_criteria: winnerCriteria,
            wait_time: waitHours * 60,
            test_size: testPercent,
            subject_lines: subjectB.trim()
              ? [subject.trim(), subjectB.trim()]
              : undefined,
            from_names: fromNameB.trim()
              ? [fromName.trim(), fromNameB.trim()]
              : undefined,
          }
        : undefined;
      const draft = (await createMailchimpCampaign(companyId, {
        type: abTest ? "variate" : "regular",
        recipients: { list_id: listId },
        settings: {
          subject_line: subject.trim(),
          title: subject.trim(),
          from_name: fromName.trim(),
          reply_to: replyTo.trim(),
          auto_footer: false,
        },
        ...(variateSettings ? { variate_settings: variateSettings } : {}),
      })) as MailchimpCampaign;

      if (html.trim()) {
        await setMailchimpCampaignContent(companyId, draft.id, { html });
      }
      onCreated(draft);
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.campaigns.createFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Wizard
        modalTitle="✨ Yeni email kampanyası"
        modalSubtitle="3 adımda taslak hazır olur — istediğinde gönderirsin"
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error ?? audienceLoadError}
        submitLabel="✓ Taslağı oluştur"
        submittingLabel="Oluşturuluyor…"
        steps={[
          {
            key: "audience",
            title: "Kime gönderelim?",
            description:
              "Email'i alacak audience'ı seç. Üye sayısı + son kampanya açılma oranını görüyorsun.",
            isValid: () => listId.length > 0,
            body: (
              <div className="flex flex-col gap-2">
                {audiences.length === 0 ? (
                  <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-tertiary)]">
                    Henüz audience yok. Önce bir audience oluşturman lazım — kampanyalar bir audience'a gönderiliyor.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {audiences.map((a) => {
                      const selected = listId === a.id;
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => pickAudience(a)}
                            className={`flex w-full flex-col items-start gap-1 rounded-[var(--radius-card)] border-2 p-4 text-left transition ${
                              selected
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : "border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--surface-subtle)]"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">
                                {a.name}
                              </span>
                              {selected ? (
                                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white">
                                  ✓ Seçili
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs text-[var(--text-secondary)]">
                              👥 {a.stats?.member_count?.toLocaleString() ?? "?"} abone
                            </span>
                            {a.stats?.open_rate !== undefined && a.stats.open_rate > 0 ? (
                              <span className="text-xs text-[var(--text-tertiary)]">
                                📈 Açılma oranı: {(a.stats.open_rate * 100).toFixed(1)}%
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ),
          },
          {
            key: "settings",
            title: "Email'in başlığı ve göndereni",
            description:
              "Alıcının inbox'ında ne göreceği. Audience seçtiğinde bazı alanları otomatik doldurduk — değiştirebilirsin.",
            isValid: () =>
              subject.trim().length > 0 &&
              fromName.trim().length > 0 &&
              replyTo.trim().length > 0,
            body: (
              <div className="flex flex-col gap-5">
                <WizardField
                  icon="🏷️"
                  label="Email konusu"
                  help="Alıcının inbox'ında 'Konu' satırında görünür. Açılma oranını en çok bu etkiler."
                  example="Yeni özelliklerimizi keşfedin: AI Lead Qualifier 🚀"
                  required
                >
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="İlgi çekici bir konu yaz…"
                    className={inputClass}
                    autoFocus
                  />
                </WizardField>
                <WizardField
                  icon="👤"
                  label="Gönderen adı"
                  help="Alıcının inbox'ında 'Kimden:' kısmında görünür. Audience'ın default'undan geldi."
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
                  icon="↩️"
                  label="Yanıt email adresi"
                  help="Alıcı 'Yanıtla' butonuna bastığında bu adrese cevap gider."
                  example="hello@lisent.ai"
                  required
                >
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="hello@lisent.ai"
                    className={inputClass}
                  />
                </WizardField>
                <details className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                    🧪 A/B testi yap (opsiyonel)
                  </summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <p className="text-xs text-[var(--text-secondary)]">
                      İki farklı konu satırını (ya da gönderen adını) küçük bir örnekleme grubuna gönder, kazanan otomatik olarak kalan abonelere gider.
                    </p>
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={abTest}
                        onChange={(e) => setAbTest(e.target.checked)}
                      />
                      A/B testini aç
                    </label>
                    {abTest && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <WizardField
                            icon="🅱️"
                            label="Konu satırı B"
                            help="Alternatif konu — A ile karşılaştırılacak."
                            example="✨ Bu hafta çok özel: %30 indirim"
                          >
                            <input
                              type="text"
                              value={subjectB}
                              onChange={(e) => setSubjectB(e.target.value)}
                              placeholder="Alternatif konu"
                              className={inputClass}
                            />
                          </WizardField>
                        </div>
                        <WizardField
                          icon="👤"
                          label="Gönderen B (opsiyonel)"
                          help="Farklı bir gönderen adı da test edebilirsin."
                          example="Kaan @ Lisent"
                        >
                          <input
                            type="text"
                            value={fromNameB}
                            onChange={(e) => setFromNameB(e.target.value)}
                            placeholder="Alternatif gönderen"
                            className={inputClass}
                          />
                        </WizardField>
                        <WizardField
                          icon="🏆"
                          label="Kazanan kriteri"
                          help="Hangi metrik daha yüksek olursa o kazanan kabul edilir."
                        >
                          <select
                            value={winnerCriteria}
                            onChange={(e) =>
                              setWinnerCriteria(
                                e.target.value as "opens" | "clicks" | "manual",
                              )
                            }
                            className={inputClass}
                          >
                            <option value="opens">📭 En çok açılan</option>
                            <option value="clicks">🖱️ En çok tıklanan</option>
                            <option value="manual">🤚 Elle seçeceğim</option>
                          </select>
                        </WizardField>
                        <WizardField
                          icon="📊"
                          label="Test grubu yüzdesi"
                          help="Audience'ın %X'ine test gider, kazanan kalanına. 10-50 arası."
                          example="25"
                        >
                          <input
                            type="number"
                            min={10}
                            max={50}
                            value={testPercent}
                            onChange={(e) => setTestPercent(Number(e.target.value))}
                            className={inputClass}
                          />
                        </WizardField>
                        <WizardField
                          icon="⏰"
                          label="Bekleme süresi (saat)"
                          help="Test bittikten sonra kazananı belirlemeden önce kaç saat beklesin."
                          example="4"
                        >
                          <input
                            type="number"
                            min={1}
                            max={168}
                            value={waitHours}
                            onChange={(e) => setWaitHours(Number(e.target.value))}
                            className={inputClass}
                          />
                        </WizardField>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ),
          },
          {
            key: "design",
            title: "Email içeriği",
            description:
              "Mevcut bir template'ten başla ya da sıfırdan yaz. Sağdaki preview alıcının ne göreceğini canlı gösterir.",
            isValid: () => html.trim().length > 0,
            body: (
              <div className="flex flex-col gap-4">
                <WizardField
                  icon="📄"
                  label="Mevcut bir template'ten başla (opsiyonel)"
                  help="Önceden oluşturduğun bir template'i seçince içeriği aşağıya yüklenir, sonra istediğin gibi düzenleyebilirsin."
                >
                  <select
                    value={templateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    disabled={loadingTemplateBody}
                    className={`${inputClass} disabled:opacity-60`}
                  >
                    <option value="">
                      {templates.length === 0
                        ? "Henüz template yok — sıfırdan yaz"
                        : "Template seçmeden sıfırdan yaz"}
                    </option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={String(tpl.id)}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </WizardField>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      ✏️ Editör
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Visual modunda Word gibi yazarsın. HTML modunda ham kod yapıştırabilirsin.
                    </span>
                    <RichTextEditor
                      value={html}
                      onChange={setHtml}
                      onPickImage={pickImage}
                      placeholder="Mesajını buraya yaz…"
                      className="flex h-[400px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      👁️ Canlı preview
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Alıcının email programında nasıl görüneceği. Merge tag'ler (*|FNAME|*) gönderim sırasında değiştirilir.
                    </span>
                    <TemplatePreviewFrame
                      html={html}
                      title={subject || "Kampanya preview"}
                      className="h-[400px] w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white"
                    />
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      {imagePicker && (
        <ImagePickerModal
          companyId={companyId}
          onPick={(url) => {
            imagePicker.resolve(url);
            setImagePicker(null);
          }}
        />
      )}
    </>
  );
}
