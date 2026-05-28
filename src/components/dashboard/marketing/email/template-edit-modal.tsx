"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

// TemplateEditModal — guided 2-step wizard for both create + edit.
// Step 1: name the template (with explanation of where it's used).
// Step 2: design the HTML body with live preview.
//
// On edit we lazy-fetch the existing HTML via GET /templates/{id} —
// thanks to the local template-html cache the body round-trips
// correctly (Mailchimp's GET response doesn't include `html` for
// code-your-own templates).
export function TemplateEditModal({
  companyId,
  template,
  onClose,
  onSaved,
}: Readonly<TemplateEditModalProps>) {
  const t = useTranslations();
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
            : t("marketing.email.templates.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingHtml(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, template, t]);

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
            : t("marketing.email.templates.saveFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Wizard
        modalTitle={
          template ? `✏️ Template'i düzenle — ${template.name}` : "✨ Yeni template oluştur"
        }
        modalSubtitle={
          template
            ? "İçeriği güncelle, kaydet — sonra kampanyalarda kullanabilirsin"
            : "2 adımda template hazır — kampanyalarda tekrar tekrar kullanırsın"
        }
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        submitLabel={template ? "✓ Değişiklikleri kaydet" : "✓ Template'i oluştur"}
        submittingLabel="Kaydediliyor…"
        steps={[
          {
            key: "name",
            title: "Template'e bir ad ver",
            description:
              "Kampanya oluştururken bu adı listeden seçeceksin. Kısa ve tanınabilir bir şey seç.",
            isValid: () => name.trim().length > 0,
            body: (
              <WizardField
                icon="📛"
                label="Template adı"
                help="Sadece sen ve takımın görür — abonelere gözükmez."
                example="Hoşgeldin emaili"
                required
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hoşgeldin emaili"
                  className={inputClass}
                  autoFocus
                />
              </WizardField>
            ),
          },
          {
            key: "design",
            title: "Email içeriği",
            description:
              "Visual modunda Word gibi yazarsın, HTML modunda ham kod yapıştırabilirsin. Sağda canlı preview.",
            isValid: () => html.trim().length > 0,
            body: (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    ✏️ Editör
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    🪄 İçi karışık HTML yapıştırırsan otomatik HTML moduna geçer, hepsi korunur.
                  </span>
                  <RichTextEditor
                    value={html}
                    onChange={setHtml}
                    onPickImage={pickImage}
                    placeholder={
                      loadingHtml ? "İçerik yükleniyor…" : "Mesajını buraya yaz…"
                    }
                    className="flex h-[480px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)]"
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
