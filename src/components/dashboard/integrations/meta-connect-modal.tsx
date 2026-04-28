"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  CRMClientError,
  completeMetaOAuth,
  connectMetaIntegration,
  finalizeMetaConfig,
  listMetaForms,
  listMetaPages,
  MetaOAuthNotConfiguredError,
  type MetaConfig,
  type MetaConnectInput,
  type MetaForm,
  type MetaPage,
} from "@/lib/crm/client";
import {
  connectMetaViaNango,
  isNangoConfigured,
  NangoNotConfiguredError,
} from "@/lib/nango/client";
import { featureFlags } from "@/config/feature-flags";

import { MetaFormPicker } from "./meta-form-picker";
import { MetaPagePicker } from "./meta-page-picker";

type MetaConnectModalProps = {
  companyId: string;
  initial: MetaConfig | null;
  onClose: () => void;
  onConnected: (
    integration: MetaConfig,
    secrets: { hmacSecretPlain?: string; webhookVerifyToken: string },
  ) => void;
};

type Mode = "choice" | "oauth-pages" | "oauth-forms" | "mock";

// MetaConnectModal — Phase 2 OAuth-first wizard.
//
// Branches:
//   • OAuth path (default when feature flag on):
//       choice → opens FB popup → callback → page picker → form picker → done
//   • Mock path (advanced link, also fallback when OAuth disabled):
//       collapsed credentials form → save (existing connect endpoint)
//
// We keep both paths in one file because the data model on the backend is
// shared (company_meta_integrations row). Splitting would just spread
// state across components without a real boundary.
export function MetaConnectModal({
  companyId,
  initial,
  onClose,
  onConnected,
}: Readonly<MetaConnectModalProps>) {
  const t = useTranslations();
  const oauthEnabled = featureFlags.metaOAuth;
  const [mode, setMode] = useState<Mode>(oauthEnabled ? "choice" : "mock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth state.
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>(initial?.metaPageId ?? "");
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(
    new Set(initial?.metaFormIds ?? []),
  );

  // Mock state.
  const [appId, setAppId] = useState<string>("");
  const [appSecret, setAppSecret] = useState<string>("");
  const [pageAccessToken, setPageAccessToken] = useState<string>("");
  const [pageId, setPageId] = useState<string>(initial?.metaPageId ?? "");
  const [pageName, setPageName] = useState<string>(initial?.metaPageName ?? "");
  const [formIdsRaw, setFormIdsRaw] = useState<string>(
    (initial?.metaFormIds ?? []).join(", "),
  );

  // ─── OAuth flow (Nango) ──────────────────────────────────────────────────
  //
  // Phase 2.1: Nango self-hosted handles the Facebook OAuth dance. We just
  // open Nango's Connect UI popup, await the result, then ping the CRM
  // backend to persist the connectionId + fetch the FB Pages list.
  // No window.open / postMessage choreography — Nango's SDK manages the
  // popup lifecycle and resolves a Promise.

  const startOAuth = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (!isNangoConfigured()) {
        throw new NangoNotConfiguredError("Nango not configured");
      }
      // Nango popup opens, user authorizes Facebook, popup closes.
      const { connectionId, providerConfigKey } = await connectMetaViaNango(companyId);
      // Backend persists the link + returns the user's FB Pages.
      const result = await completeMetaOAuth(companyId, {
        connectionId,
        providerConfigKey,
      });
      setPages(result.pages);
      setMode("oauth-pages");
    } catch (err) {
      if (
        err instanceof NangoNotConfiguredError ||
        err instanceof MetaOAuthNotConfiguredError
      ) {
        setError(t("integrations.meta.oauthNotConfigured"));
        setMode("mock");
        return;
      }
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("integrations.meta.oauthFailed"),
      );
    } finally {
      setBusy(false);
    }
  }, [companyId, t]);

  async function refreshPages() {
    setBusy(true);
    try {
      const fresh = await listMetaPages(companyId);
      setPages(fresh);
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pickPage(p: string) {
    setSelectedPageId(p);
    setBusy(true);
    setError(null);
    try {
      const fs = await listMetaForms(companyId, p);
      setForms(fs);
      setMode("oauth-forms");
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleForm(id: string) {
    setSelectedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function finalize() {
    setBusy(true);
    setError(null);
    try {
      const cfg = await finalizeMetaConfig(companyId, {
        pageId: selectedPageId,
        formIds: Array.from(selectedFormIds),
      });
      onConnected(cfg, { webhookVerifyToken: cfg.webhookVerifyToken });
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ─── Mock flow ───────────────────────────────────────────────────────────

  async function submitMock() {
    setBusy(true);
    setError(null);
    try {
      const formIds = formIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload: MetaConnectInput = {
        appId,
        appSecret,
        pageAccessToken,
        pageId,
        pageName,
        formIds,
        mockMode: true,
      };
      const res = await connectMetaIntegration(companyId, payload);
      onConnected(res.integration, {
        hmacSecretPlain: res.hmacSecretPlain,
        webhookVerifyToken: res.webhookVerifyToken,
      });
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card-lg)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("integrations.meta.connectTitle")}
          </h2>
          <button
            aria-label={t("integrations.meta.cancel")}
            className="rounded-full p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mode === "choice" && (
            <ChoiceView
              busy={busy}
              onMockClick={() => setMode("mock")}
              onOAuthClick={startOAuth}
            />
          )}
          {mode === "oauth-pages" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {t("integrations.meta.pagePickerTitle")}
                </h3>
              </div>
              <MetaPagePicker
                onSelect={pickPage}
                pages={pages}
                selected={selectedPageId}
              />
              <button
                className="self-start text-sm font-medium text-[var(--accent-strong)] hover:underline disabled:opacity-50"
                disabled={busy}
                onClick={() => void refreshPages()}
                type="button"
              >
                {t("integrations.refresh")}
              </button>
            </div>
          )}
          {mode === "oauth-forms" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {t("integrations.meta.formPickerTitle")}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {t("integrations.meta.formPickerHint")}
                </p>
              </div>
              <MetaFormPicker
                forms={forms}
                onToggle={toggleForm}
                selected={selectedFormIds}
              />
            </div>
          )}
          {mode === "mock" && (
            <MockForm
              appId={appId}
              appSecret={appSecret}
              formIdsRaw={formIdsRaw}
              onAppId={setAppId}
              onAppSecret={setAppSecret}
              onFormIdsRaw={setFormIdsRaw}
              onPageAccessToken={setPageAccessToken}
              onPageId={setPageId}
              onPageName={setPageName}
              pageAccessToken={pageAccessToken}
              pageId={pageId}
              pageName={pageName}
            />
          )}

          {error && (
            <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-4">
          <button
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            {t("integrations.meta.cancel")}
          </button>
          <div className="flex items-center gap-2">
            {mode === "oauth-pages" && (
              <button
                className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                onClick={() => setMode("choice")}
                type="button"
              >
                {t("integrations.meta.back")}
              </button>
            )}
            {mode === "oauth-forms" && (
              <button
                className="rounded-full border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                onClick={() => setMode("oauth-pages")}
                type="button"
              >
                {t("integrations.meta.back")}
              </button>
            )}
            {mode === "oauth-forms" && (
              <button
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy || !selectedPageId}
                onClick={() => void finalize()}
                type="button"
              >
                {busy ? "…" : t("integrations.meta.finalizeButton")}
              </button>
            )}
            {mode === "mock" && (
              <button
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={() => void submitMock()}
                type="button"
              >
                {busy ? "…" : t("integrations.meta.connectButton")}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-views ──────────────────────────────────────────────────────────────

function ChoiceView({
  busy,
  onOAuthClick,
  onMockClick,
}: {
  busy: boolean;
  onOAuthClick: () => void;
  onMockClick: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-5">
      <button
        className="flex items-center justify-center gap-3 rounded-[var(--radius-card)] bg-[#1877F2] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155bbf] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy}
        onClick={onOAuthClick}
        type="button"
      >
        <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
          <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82V14.706h-3.13v-3.62h3.13v-2.764c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.464.099 2.795.143v3.24h-1.918c-1.504 0-1.795.715-1.795 1.764v2.31h3.59l-.467 3.62h-3.123V24h6.115C23.407 24 24 23.407 24 22.676V1.325C24 .593 23.407 0 22.676 0z" />
        </svg>
        {busy ? t("integrations.meta.oauthInProgress") : t("integrations.meta.connectWithFacebook")}
      </button>
      <p className="text-sm text-[var(--text-secondary)]">
        {t("integrations.meta.oauthScopeExplain")}
      </p>
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          className="text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:underline"
          onClick={onMockClick}
          type="button"
        >
          {t("integrations.meta.advancedMockLink")}
        </button>
      </div>
    </div>
  );
}

function MockForm({
  appId,
  appSecret,
  pageAccessToken,
  pageId,
  pageName,
  formIdsRaw,
  onAppId,
  onAppSecret,
  onPageAccessToken,
  onPageId,
  onPageName,
  onFormIdsRaw,
}: {
  appId: string;
  appSecret: string;
  pageAccessToken: string;
  pageId: string;
  pageName: string;
  formIdsRaw: string;
  onAppId: (v: string) => void;
  onAppSecret: (v: string) => void;
  onPageAccessToken: (v: string) => void;
  onPageId: (v: string) => void;
  onPageName: (v: string) => void;
  onFormIdsRaw: (v: string) => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        {t("integrations.meta.mockModeHint")}
      </p>
      <Field hint={t("integrations.meta.appIdHint")} label={t("integrations.meta.appIdLabel")}>
        <Input onChange={onAppId} placeholder="1234567890abcdef" value={appId} />
      </Field>
      <Field hint={t("integrations.meta.appSecretHint")} label={t("integrations.meta.appSecretLabel")}>
        <Input mono onChange={onAppSecret} placeholder="•••" type="password" value={appSecret} />
      </Field>
      <Field
        hint={t("integrations.meta.pageAccessTokenHint")}
        label={t("integrations.meta.pageAccessTokenLabel")}
      >
        <Input mono onChange={onPageAccessToken} placeholder="EAAG…" type="password" value={pageAccessToken} />
      </Field>
      <Field hint={t("integrations.meta.pageIdHint")} label={t("integrations.meta.pageIdLabel")}>
        <Input mono onChange={onPageId} placeholder="117482..." value={pageId} />
      </Field>
      <Field hint={t("integrations.meta.pageNameHint")} label={t("integrations.meta.pageNameLabel")}>
        <Input onChange={onPageName} placeholder="Acme Corp" value={pageName} />
      </Field>
      <Field hint={t("integrations.meta.formIdsHint")} label={t("integrations.meta.formIdsLabel")}>
        <textarea
          className="min-h-[64px] w-full rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm font-mono focus:border-[var(--accent)] focus:outline-none"
          onChange={(e) => onFormIdsRaw(e.target.value)}
          placeholder="123456789, 987654321"
          value={formIdsRaw}
        />
      </Field>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      className={`w-full rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none ${mono ? "font-mono" : ""}`}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>}
    </label>
  );
}
