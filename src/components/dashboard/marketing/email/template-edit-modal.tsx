"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CRMClientError,
  createMailchimpTemplate,
  getMailchimpTemplate,
  updateMailchimpTemplate,
  type MailchimpTemplate,
} from "@/lib/crm/client";

import { ImagePickerModal } from "./image-picker-modal";
import { RichTextEditor } from "./rich-text-editor";
import { TemplatePreviewFrame } from "./template-preview-frame";
import { Wizard } from "./wizard";
import { WizardField } from "./wizard-field";

type TemplateEditModalProps = {
  companyId: string;
  // null → create flow; existing template → edit flow.
  template: MailchimpTemplate | null;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// TemplateEditModal — minimal 2-step wizard. Step 1 names the template,
// step 2 designs the body. Edit mode lazy-fetches the cached HTML so the
// editor starts populated.
export function TemplateEditModal({
  companyId,
  template,
  onClose,
  onSaved,
}: Readonly<TemplateEditModalProps>) {
  const [name, setName] = useState(template?.name ?? "");
  const [html, setHtml] = useState("");
  const [loadingHtml, setLoadingHtml] = useState(template !== null);
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
    if (!template) return;
    let cancelled = false;
    getMailchimpTemplate(companyId, template.id)
      .then((res) => {
        if (cancelled) return;
        const body =
          (res as { html?: string; source?: { html?: string } }).html ??
          (res as { source?: { html?: string } }).source?.html ??
          "";
        setHtml(body);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : "Failed to load the template body.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingHtml(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, template]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (template) {
        await updateMailchimpTemplate(companyId, template.id, {
          name: name.trim(),
          html,
        });
      } else {
        await createMailchimpTemplate(companyId, {
          name: name.trim(),
          html,
        });
      }
      onSaved();
    } catch (err) {
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save the template.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Wizard
        modalTitle={template ? `Edit template — ${template.name}` : "New template"}
        modalSubtitle={
          template
            ? "Update the name or the body, then save."
            : "Two short steps — then you can use it from any campaign."
        }
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        submitLabel={template ? "Save changes" : "Create template"}
        submittingLabel="Saving…"
        steps={[
          {
            key: "name",
            title: "Name the template",
            description: "A short label your team uses to find it later.",
            isValid: () => name.trim().length > 0,
            body: (
              <WizardField
                label="Template name"
                help="Subscribers never see this. Pick something short and descriptive."
                example="Welcome email"
                required
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Welcome email"
                  className={inputClass}
                  autoFocus
                />
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
                    placeholder={
                      loadingHtml ? "Loading template body…" : "Type your email body here…"
                    }
                    className="flex h-[480px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)]"
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
                    title={`${name || "Template"} preview`}
                    className="h-[480px] w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white"
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
