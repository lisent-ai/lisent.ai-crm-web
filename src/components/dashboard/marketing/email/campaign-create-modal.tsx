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

type CampaignCreateModalProps = {
  companyId: string;
  onClose: () => void;
  onCreated: (campaign: MailchimpCampaign) => void;
};

// CampaignCreateModal posts a minimal "regular" campaign — Mailchimp's
// default type for one-shot HTML broadcasts. We chain two API calls:
//   1. POST /3.0/campaigns with the recipients + settings envelope
//   2. PUT  /3.0/campaigns/{id}/content with raw HTML the operator typed
//
// On success the draft is sitting in Mailchimp ready to send. The
// CampaignList re-fetches and the row's "Send" button takes it live.
// We deliberately do NOT auto-send on submit — the send action lives on
// the list row so the operator has one last sanity check.
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
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [html, setHtml] = useState(
    "<p>Hello {{FNAME|there}},</p>\n<p>Type your message here.</p>",
  );
  const [templateId, setTemplateId] = useState<string>("");
  const [loadingTemplateBody, setLoadingTemplateBody] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A/B test toggle + extra variate fields. Off by default so the
  // modal stays simple for the common "regular" campaign flow; toggling
  // on expands a small section between subject and content.
  const [abTest, setAbTest] = useState(false);
  const [subjectB, setSubjectB] = useState("");
  const [fromNameB, setFromNameB] = useState("");
  const [winnerCriteria, setWinnerCriteria] = useState<
    "opens" | "clicks" | "manual"
  >("opens");
  const [testPercent, setTestPercent] = useState(25);
  const [waitHours, setWaitHours] = useState(4);
  // Hide rarely-needed fields behind an "Advanced" toggle so the modal
  // doesn't overwhelm operators on first open.
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Promise-style image picker so TipTap's onPickImage callback can await
  // until the modal resolves with a URL.
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
    // Fetch audiences + user templates in parallel so the modal is
    // ready as a one-stop shop. Both lists feed dropdowns; templates
    // is empty-OK (Mailchimp accounts with no user templates just
    // get the HTML textarea fallback).
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
        if (lists.length > 0 && !listId) {
          setListId(lists[0].id);
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
      if (body) {
        setHtml(body);
      }
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
    if (!listId) {
      setError(t("marketing.email.campaigns.errAudienceRequired"));
      return;
    }
    if (!subject.trim()) {
      setError(t("marketing.email.campaigns.errSubjectRequired"));
      return;
    }
    if (!fromName.trim() || !replyTo.trim()) {
      setError(t("marketing.email.campaigns.errFromRequired"));
      return;
    }

    setSubmitting(true);
    try {
      // Variate campaigns post different shape than regular: a
      // `variate_settings` block with subject_lines + from_names + winner
      // criteria. The base settings still need a subject_line for the
      // "control" variant — Mailchimp uses the first variate entry as
      // control.
      const variateSettings = abTest
        ? {
            winner_criteria: winnerCriteria,
            wait_time: waitHours * 60, // Mailchimp wants minutes
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
          title: (title || subject).trim(),
          from_name: fromName.trim(),
          reply_to: replyTo.trim(),
          auto_footer: false,
        },
        ...(variateSettings ? { variate_settings: variateSettings } : {}),
      })) as MailchimpCampaign;

      if (html.trim()) {
        await setMailchimpCampaignContent(companyId, draft.id, {
          html,
        });
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header keeps title + close reachable while scrolling. */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl border-b border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("marketing.email.campaigns.createTitle")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("marketing.email.campaigns.createBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            aria-label={t("marketing.email.audiences.members.close")}
          >
            ✕
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {(error || audienceLoadError) && (
          <p className="sticky top-2 z-10 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-3 py-2 text-sm font-medium text-[var(--signal-red)] shadow-sm">
            ⚠ {error ?? audienceLoadError}
          </p>
        )}

        <div className="flex flex-col gap-5">
          {/* ── Step 1: Who is this for? */}
          <fieldset className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">
              1. {t("marketing.email.campaigns.step1Title")}
            </legend>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.fields.audience")}
              </span>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                <option value="" disabled>
                  {audiences.length === 0
                    ? t("marketing.email.campaigns.audiencesEmpty")
                    : t("marketing.email.campaigns.fields.audiencePlaceholder")}
                </option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.stats?.member_count ?? "?"} members)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.fields.subject")}
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("marketing.email.campaigns.fields.subjectPlaceholder")}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
          </fieldset>

          {/* ── Step 2: Who is it from? */}
          <fieldset className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">
              2. {t("marketing.email.campaigns.step2Title")}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("marketing.email.campaigns.fields.fromName")}
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
                  {t("marketing.email.campaigns.fields.replyTo")}
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
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-3 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {showAdvanced
                ? t("marketing.email.campaigns.hideAdvanced")
                : t("marketing.email.campaigns.showAdvanced")}
            </button>
            {showAdvanced && (
              <label className="mt-2 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("marketing.email.campaigns.fields.internalTitle")}
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("marketing.email.campaigns.fields.internalTitlePlaceholder")}
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </label>
            )}
          </fieldset>

          {/* ── Step 3: Content */}
          <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">
              3. {t("marketing.email.campaigns.step3Title")}
            </legend>
          <label className="flex items-center gap-2 self-start text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={abTest}
              onChange={(e) => setAbTest(e.target.checked)}
            />
            <span>
              <span className="font-medium">
                {t("marketing.email.campaigns.abtest.toggle")}
              </span>
              <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.abtest.toggleHint")}
              </span>
            </span>
          </label>

          {abTest && (
            <div className="grid grid-cols-1 gap-3 rounded-[var(--radius-card)] border border-[var(--accent)] bg-[var(--accent-soft)] p-3 sm:grid-cols-2">
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
                  <option value="opens">
                    {t("marketing.email.campaigns.abtest.criteria.opens")}
                  </option>
                  <option value="clicks">
                    {t("marketing.email.campaigns.abtest.criteria.clicks")}
                  </option>
                  <option value="manual">
                    {t("marketing.email.campaigns.abtest.criteria.manual")}
                  </option>
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
              <p className="text-xs text-[var(--text-tertiary)] sm:col-span-2">
                {t("marketing.email.campaigns.abtest.hint")}
              </p>
            </div>
          )}

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
              <span className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                <span>{t("marketing.email.campaigns.fields.htmlBody")}</span>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-[var(--accent)] hover:underline"
                >
                  {showPreview
                    ? t("marketing.email.campaigns.fields.hidePreview")
                    : t("marketing.email.campaigns.fields.showPreview")}
                </button>
              </span>
              <RichTextEditor
                value={html}
                onChange={setHtml}
                onPickImage={pickImage}
                placeholder="Type your email body here…"
                className="flex h-[400px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)]"
              />
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.campaigns.fields.htmlHint")}
              </span>
            </div>

            {showPreview ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  {t("marketing.email.templates.preview")}
                </span>
                <TemplatePreviewFrame
                  html={html}
                  title={subject || "Campaign preview"}
                  className="h-[400px] w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white"
                />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {t("marketing.email.templates.previewHint")}
                </span>
              </div>
            ) : null}
          </div>
          </fieldset>
        </div>

        </div>

        {/* Sticky footer: error appears next to the Save button so the
            operator never wonders why nothing happened. */}
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-b-3xl border-t border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-3">
          {(error || audienceLoadError) && (
            <p className="mr-auto text-sm font-medium text-[var(--signal-red)]">
              ⚠ {error ?? audienceLoadError}
            </p>
          )}
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
              ? t("marketing.email.campaigns.creating")
              : t("marketing.email.campaigns.createSubmit")}
          </button>
        </footer>
      </div>

      {imagePicker && (
        <ImagePickerModal
          companyId={companyId}
          onPick={(url) => {
            imagePicker.resolve(url);
            setImagePicker(null);
          }}
        />
      )}
    </div>
  );
}
