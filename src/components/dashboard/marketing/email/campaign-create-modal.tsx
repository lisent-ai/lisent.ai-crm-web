"use client";

import { useCallback, useEffect, useState } from "react";

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

type CampaignDefaults = {
  from_name?: string;
  from_email?: string;
  subject?: string;
};

// CampaignCreateModal — atomic wizard. Picks audience first; the
// audience's stored campaign_defaults pre-fill the sender steps so the
// operator usually only types the subject.
export function CampaignCreateModal({
  companyId,
  onClose,
  onCreated,
}: Readonly<CampaignCreateModalProps>) {
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
        setAudiences(audRes.lists ?? []);
        setTemplates(tplRes.templates ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setAudienceLoadError(
          err instanceof CRMClientError
            ? err.message
            : "Failed to load audiences.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

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
          : "Failed to load the template body.",
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
            : "Failed to create the campaign.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Wizard
        modalTitle="New email campaign"
        modalSubtitle="A guided setup — one step at a time."
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error ?? audienceLoadError}
        submitLabel="Create draft"
        submittingLabel="Creating…"
        steps={[
          {
            key: "audience",
            title: "Pick the audience",
            description:
              "Who will receive this campaign? Click a card to choose.",
            isValid: () => listId.length > 0,
            body: (
              <div className="flex flex-col gap-2">
                {audiences.length === 0 ? (
                  <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-tertiary)]">
                    You don&apos;t have any audiences yet. Create one first — campaigns are sent to a specific audience.
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
                                  Selected
                                </span>
                              ) : null}
                            </div>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {a.stats?.member_count?.toLocaleString() ?? "?"} subscribers
                            </span>
                            {a.stats?.open_rate !== undefined && a.stats.open_rate > 0 ? (
                              <span className="text-xs text-[var(--text-tertiary)]">
                                Open rate: {(a.stats.open_rate * 100).toFixed(1)}%
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
            key: "subject",
            title: "What's the subject line?",
            description: "What recipients see in their inbox under Subject.",
            isValid: () => subject.trim().length > 0,
            body: (
              <WizardField
                label="Subject line"
                help="This is the single biggest driver of open rates. Make it clear and specific."
                example="Your weekly product update"
                required
              >
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
            ),
          },
          {
            key: "from-name",
            title: "Who is the sender?",
            description:
              "The display name that appears in the From field of the email.",
            isValid: () => fromName.trim().length > 0,
            body: (
              <WizardField
                label="From name"
                help="Pre-filled from your audience defaults. You can change it for this campaign."
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
            key: "reply-to",
            title: "Where should replies go?",
            description:
              "When subscribers hit Reply, the response lands at this address.",
            isValid: () => replyTo.trim().length > 0 && replyTo.includes("@"),
            body: (
              <WizardField
                label="Reply-to email"
                help="Pre-filled from your audience defaults. Use an inbox you actually monitor."
                example="hello@yourdomain.com"
                required
              >
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="hello@yourdomain.com"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
            ),
          },
          {
            key: "ab",
            title: "A/B test (optional)",
            description:
              "Send two subject lines or sender names to a sample, send the winner to the rest.",
            isValid: () => true,
            alwaysComplete: true,
            body: (
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={abTest}
                    onChange={(e) => setAbTest(e.target.checked)}
                  />
                  Enable A/B testing for this campaign
                </label>
                {abTest && (
                  <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                    <WizardField
                      label="Alternate subject line"
                      help="The B version we'll test against the A version above."
                      example="Try our new feature today"
                    >
                      <input
                        type="text"
                        value={subjectB}
                        onChange={(e) => setSubjectB(e.target.value)}
                        placeholder="Alternate subject"
                        className={inputClass}
                      />
                    </WizardField>
                    <WizardField
                      label="Alternate from name (optional)"
                      help="Test a different sender name in parallel."
                      example="The Lisent Team"
                    >
                      <input
                        type="text"
                        value={fromNameB}
                        onChange={(e) => setFromNameB(e.target.value)}
                        placeholder="Alternate sender"
                        className={inputClass}
                      />
                    </WizardField>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <WizardField
                        label="Winner criteria"
                        help="How Mailchimp decides the winner."
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
                          <option value="opens">Highest open rate</option>
                          <option value="clicks">Highest click rate</option>
                          <option value="manual">Pick manually</option>
                        </select>
                      </WizardField>
                      <WizardField
                        label="Test audience size (%)"
                        help="Share of subscribers that get the test."
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
                        label="Wait time (hours)"
                        help="How long to wait before sending the winner to the rest."
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
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "template",
            title: "Start from a template (optional)",
            description:
              "Pick a saved template to pre-fill the email body, or skip to write from scratch.",
            isValid: () => true,
            alwaysComplete: true,
            body: (
              <WizardField
                label="Template"
                help="Picking a template loads its content into the editor in the next step. You can still edit it."
              >
                <select
                  value={templateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  disabled={loadingTemplateBody}
                  className={`${inputClass} disabled:opacity-60`}
                  autoFocus
                >
                  <option value="">
                    {templates.length === 0
                      ? "No templates yet — write from scratch"
                      : "Write from scratch"}
                  </option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={String(tpl.id)}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </WizardField>
            ),
          },
          {
            key: "design",
            title: "Write the email",
            description:
              "Visual mode for rich text, HTML mode for raw code. Live preview on the right.",
            isValid: () => html.trim().length > 0,
            body: (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Editor
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Pasting styled HTML auto-switches to HTML mode so nothing is stripped.
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
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Live preview
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    How recipients see the email. Merge tags like *|FNAME|* are filled in at send time.
                  </span>
                  <TemplatePreviewFrame
                    html={html}
                    title={subject || "Campaign preview"}
                    className="h-[400px] w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white"
                  />
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
