"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  deleteMailchimpFile,
  listMailchimpFiles,
  type MailchimpFile,
  uploadMailchimpFile,
} from "@/lib/crm/client";

type ImagePickerModalProps = {
  companyId: string;
  // Resolved with the picked image URL (full-size), or null on cancel.
  onPick: (url: string | null) => void;
};

// ImagePickerModal is the inserter the RichTextEditor opens from its
// image toolbar button. Three modes:
//
//   1. "Upload new"        — base64-encode an operator-chosen file and
//                            POST to Mailchimp's File Manager.
//   2. "Pick from library" — paginate existing Mailchimp-hosted images;
//                            click one to insert.
//   3. "URL"               — operator pastes a public URL (Mailchimp may
//                            cache it; useful for external CDN assets).
//
// The picked URL is inserted into TipTap via the onPickImage callback's
// promise resolution.
type Mode = "library" | "upload" | "url";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Mailchimp's documented 10MB cap

export function ImagePickerModal({
  companyId,
  onPick,
}: Readonly<ImagePickerModalProps>) {
  const t = useTranslations();
  const [mode, setMode] = useState<Mode>("library");
  const [items, setItems] = useState<MailchimpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // URL state
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    listMailchimpFiles(companyId, {
      count: 60,
      type: "image",
      sort_field: "added_date",
      sort_dir: "DESC",
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.files ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.images.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refreshTick, t]);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(t("marketing.email.images.errTooLarge"));
        return;
      }
      setUploading(true);
      try {
        // Mailchimp's File Manager wants base64 in the file_data field.
        // FileReader gives us a data:URL; we strip the "data:...;base64,"
        // prefix to send the raw payload.
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const comma = result.indexOf(",");
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
          };
          reader.onerror = () => reject(reader.error ?? new Error("file read failed"));
          reader.readAsDataURL(file);
        });
        const created = await uploadMailchimpFile(companyId, {
          name: file.name,
          file_data: base64,
        });
        const url = created.full_size_url ?? created.thumbnail_url ?? "";
        if (!url) {
          setUploadError(t("marketing.email.images.errNoUrl"));
          return;
        }
        onPick(url);
      } catch (err) {
        setUploadError(
          err instanceof CRMClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : t("marketing.email.images.uploadFailed"),
        );
      } finally {
        setUploading(false);
      }
    },
    [companyId, onPick, t],
  );

  const handleDelete = useCallback(
    async (file: MailchimpFile) => {
      if (!window.confirm(t("marketing.email.images.confirmDelete"))) return;
      try {
        await deleteMailchimpFile(companyId, file.id);
        refresh();
      } catch (err) {
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.images.deleteFailed"),
        );
      }
    },
    [companyId, refresh, t],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => onPick(null)}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("marketing.email.images.title")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("marketing.email.images.body")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="rounded-full px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            aria-label={t("marketing.email.audiences.members.close")}
          >
            ✕
          </button>
        </header>

        <nav className="flex gap-1 border-b border-[var(--border-subtle)]">
          {(["library", "upload", "url"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`relative px-3 py-2 text-sm transition ${
                mode === key
                  ? "font-semibold text-[var(--text-primary)]"
                  : "font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t(`marketing.email.images.modes.${key}` as never)}
              {mode === key && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--text-primary)]"
                />
              )}
            </button>
          ))}
        </nav>

        {error && (
          <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        {mode === "library" && (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
                {t("marketing.email.images.loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">
                {t("marketing.email.images.empty")}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((file) => (
                  <li
                    key={file.id}
                    className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]"
                  >
                    <button
                      type="button"
                      onClick={() => onPick(file.full_size_url ?? file.thumbnail_url ?? "")}
                      className="flex w-full flex-col text-left"
                    >
                      <img
                        src={file.thumbnail_url ?? file.full_size_url ?? ""}
                        alt={file.name}
                        className="aspect-video w-full bg-[var(--surface-subtle)] object-cover"
                      />
                      <span className="truncate px-2 py-1.5 text-xs text-[var(--text-primary)]">
                        {file.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={t("marketing.email.images.delete")}
                      title={t("marketing.email.images.delete")}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mode === "upload" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
            <label
              className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-10 text-center transition hover:bg-[var(--surface)] ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {uploading
                  ? t("marketing.email.images.uploading")
                  : t("marketing.email.images.pickFile")}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.images.pickHint")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                disabled={uploading}
              />
            </label>
            {uploadError && (
              <p className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
                {uploadError}
              </p>
            )}
          </div>
        )}

        {mode === "url" && (
          <div className="flex flex-1 flex-col gap-2 py-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                {t("marketing.email.images.urlLabel")}
              </span>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/banner.png"
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <span className="text-xs text-[var(--text-tertiary)]">
                {t("marketing.email.images.urlHint")}
              </span>
            </label>
            <button
              type="button"
              onClick={() => urlInput.trim() && onPick(urlInput.trim())}
              disabled={!urlInput.trim()}
              className="self-start rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {t("marketing.email.images.insertUrl")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
