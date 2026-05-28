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

type CampaignCreateModalProps = {
  companyId: string;
  onClose: () => void;
  onCreated: (campaign: MailchimpCampaign) => void;
};

// CampaignCreateModal as a 3-step wizard. The flow operators actually
// run in Mailchimp's own UI:
//   1. Pick audience (visual cards with member count)
//   2. From who + subject + (optional) A/B test toggle
//   3. Design email (template chooser + editor + live preview)
//
// Backend interaction order on Submit: create campaign draft (POST
// /campaigns) → set content (PUT /campaigns/{id}/content). The draft
// lands in Mailchimp; the operator sends from the list row.
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
    "<p>Hello {{FNAME|there}},</p>\n<p>Type your message here.</p>",
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
        const lists = audRes.lists ?? [];
        setAudiences(lists);
        setTemplates(tplRes.templates ?? []);
        if (lists.length > 0) {
          if (!listId) setListId(lists[0].id);
          if (!fromName) {
            const def = lists[0].contact?.company?.trim();
            if (def) setFromName(def);
          }
        }
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
        modalTitle={t("marketing.email.campaigns.createTitle")}
        modalSubtitle={t("marketing.email.campaigns.createBody")}
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error ?? audienceLoadError}
        submitLabel={t("marketing.email.campaigns.createSubmit")}
        submittingLabel={t("marketing.email.campaigns.creating")}
        steps={[
          {
            key: "audience",
            title: t("marketing.email.campaigns.wizard.step1Title"),
            description: t("marketing.email.campaigns.wizard.step1Body"),
            isValid: () => listId.length > 0,
            body: (
              <div className="flex flex-col gap-2">
                {audiences.length === 0 ? (
                  <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-tertiary)]">
                    {t("marketing.email.campaigns.audiencesEmpty")}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {audiences.map((a) => {
                      const selected = listId === a.id;
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setListId(a.id);
                              if (!fromName && a.contact?.company) {
                                setFromName(a.contact.company);
                              }
                            }}
                            className={`flex w-full flex-col items-start gap-1 rounded-[var(--radius-card)] border-2 p-3 text-left transition ${
                              selected
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : "border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--surface-subtle)]"
                            }`}
                          >
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              {a.name}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              👥 {a.stats?.member_count?.toLocaleString() ?? "?"}{" "}
                              {t("marketing.email.audiences.col.members").toLowerCase()}
                            </span>
                            {a.stats?.open_rate !== undefined ? (
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {(a.stats.open_rate * 100).toFixed(1)}% open rate
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
            title: t("marketing.email.campaigns.wizard.step2Title"),
            description: t("marketing.email.campaigns.wizard.step2Body"),
            isValid: () =>
              subject.trim().length > 0 &&
              fromName.trim().length > 0 &&
              replyTo.trim().length > 0,
            body: (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    {t("marketing.email.campaigns.fields.subject")}{" "}
                    <span className="text-[var(--signal-red)]">*</span>
                  </span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("marketing.email.campaigns.fields.subjectPlaceholder")}
                    className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    autoFocus
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                      {t("marketing.email.campaigns.fields.fromName")}{" "}
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
                      {t("marketing.email.campaigns.fields.replyTo")}{" "}
                      <span className="text-[var(--signal-red)]">*</span>
                    </span>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="noreply@lisent.ai"
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                  </label>
                </div>

                <details className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                    🧪 {t("marketing.email.campaigns.abtest.toggle")}
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={abTest}
                        onChange={(e) => setAbTest(e.target.checked)}
                      />
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {t("marketing.email.campaigns.abtest.toggleHint")}
                      </span>
                    </label>
                    {abTest && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 sm:col-span-2">
                          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                            {t("marketing.email.campaigns.abtest.subjectB")}
                          </span>
                          <input
                            type="text"
                            value={subjectB}
                            onChange={(e) => setSubjectB(e.target.value)}
                            placeholder={t("marketing.email.campaigns.abtest.subjectBPlaceholder")}
                            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                            {t("marketing.email.campaigns.abtest.fromNameB")}
                          </span>
                          <input
                            type="text"
                            value={fromNameB}
                            onChange={(e) => setFromNameB(e.target.value)}
                            placeholder={t("marketing.email.campaigns.abtest.fromNameBPlaceholder")}
                            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                            {t("marketing.email.campaigns.abtest.winnerCriteria")}
                          </span>
                          <select
                            value={winnerCriteria}
                            onChange={(e) =>
                              setWinnerCriteria(e.target.value as "opens" | "clicks" | "manual")
                            }
                            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          >
                            <option value="opens">{t("marketing.email.campaigns.abtest.criteria.opens")}</option>
                            <option value="clicks">{t("marketing.email.campaigns.abtest.criteria.clicks")}</option>
                            <option value="manual">{t("marketing.email.campaigns.abtest.criteria.manual")}</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                            {t("marketing.email.campaigns.abtest.testPercent")}
                          </span>
                          <input
                            type="number"
                            min={10}
                            max={50}
                            value={testPercent}
                            onChange={(e) => setTestPercent(Number(e.target.value))}
                            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                            {t("marketing.email.campaigns.abtest.waitHours")}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={168}
                            value={waitHours}
                            onChange={(e) => setWaitHours(Number(e.target.value))}
                            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ),
          },
          {
            key: "design",
            title: t("marketing.email.campaigns.wizard.step3Title"),
            description: t("marketing.email.campaigns.wizard.step3Body"),
            isValid: () => html.trim().length > 0,
            body: (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                    {t("marketing.email.campaigns.fields.template")}
                  </span>
                  <select
                    value={templateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    disabled={loadingTemplateBody}
                    className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
                  >
                    <option value="">
                      {templates.length === 0
                        ? t("marketing.email.campaigns.fields.templatesEmpty")
                        : t("marketing.email.campaigns.fields.templatePlaceholder")}
                    </option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={String(tpl.id)}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {loadingTemplateBody
                      ? t("marketing.email.templates.loadingBody")
                      : t("marketing.email.campaigns.fields.templateHint")}
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                      {t("marketing.email.campaigns.fields.htmlBody")}
                    </span>
                    <RichTextEditor
                      value={html}
                      onChange={setHtml}
                      onPickImage={pickImage}
                      placeholder="Type your email body here…"
                      className="flex h-[400px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                      {t("marketing.email.templates.preview")}
                    </span>
                    <TemplatePreviewFrame
                      html={html}
                      title={subject || "Campaign preview"}
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
