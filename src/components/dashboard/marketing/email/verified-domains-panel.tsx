"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  addMailchimpVerifiedDomain,
  CRMClientError,
  deleteMailchimpVerifiedDomain,
  listMailchimpVerifiedDomains,
  type MailchimpVerifiedDomain,
  verifyMailchimpDomain,
} from "@/lib/crm/client";

type VerifiedDomainsPanelProps = {
  companyId: string;
};

// VerifiedDomainsPanel lets the operator authenticate their sending
// domain (DKIM/SPF setup) without leaving the CRM. The flow Mailchimp
// requires:
//
//   1. Operator submits an email at the domain they want to authenticate.
//   2. Mailchimp emails a verification code to that address.
//   3. Operator pastes the code back here; we POST it to /verify.
//   4. After verification, the operator also needs to add the DKIM TXT
//      records to their DNS — but those records come from Mailchimp's
//      UI Domain Authentication page (no API). We surface a deep link.
//
// This panel directly addresses the "account flagged by Omnivore"
// scenario — authenticated domains have much higher trust scores.
export function VerifiedDomainsPanel({ companyId }: Readonly<VerifiedDomainsPanelProps>) {
  const t = useTranslations();
  const [items, setItems] = useState<MailchimpVerifiedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Add-domain form state
  const [emailInput, setEmailInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Verify code state — keyed by domain
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    listMailchimpVerifiedDomains(companyId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.domains ?? []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof CRMClientError
            ? err.message
            : t("marketing.email.domains.loadFailed"),
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

  async function handleAdd() {
    setActionError(null);
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setActionError(t("marketing.email.domains.errEmailRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await addMailchimpVerifiedDomain(companyId, {
        verification_email: emailInput.trim(),
      });
      setEmailInput("");
      refresh();
    } catch (err) {
      setActionError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("marketing.email.domains.addFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(domain: string) {
    setActionError(null);
    const code = (codeInputs[domain] ?? "").trim();
    if (!code) {
      setActionError(t("marketing.email.domains.errCodeRequired"));
      return;
    }
    try {
      await verifyMailchimpDomain(companyId, domain, { code });
      setCodeInputs((prev) => ({ ...prev, [domain]: "" }));
      refresh();
    } catch (err) {
      setActionError(
        err instanceof CRMClientError
          ? err.message
          : t("marketing.email.domains.verifyFailed"),
      );
    }
  }

  async function handleDelete(domain: string) {
    if (!window.confirm(t("marketing.email.domains.confirmDelete"))) return;
    try {
      await deleteMailchimpVerifiedDomain(companyId, domain);
      refresh();
    } catch (err) {
      setActionError(
        err instanceof CRMClientError
          ? err.message
          : t("marketing.email.domains.deleteFailed"),
      );
    }
  }

  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
      <header>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t("marketing.email.domains.title")}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("marketing.email.domains.body")}
        </p>
      </header>

      {(error || actionError) && (
        <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
          {error ?? actionError}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("marketing.email.domains.addEmailLabel")}
          </span>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="hello@yourdomain.com"
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {submitting
            ? t("marketing.email.domains.adding")
            : t("marketing.email.domains.add")}
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.domains.addHint")}
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-tertiary)]">
          {t("marketing.email.domains.loading")}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-tertiary)]">
          {t("marketing.email.domains.empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((d) => (
            <li
              key={d.domain}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-[var(--text-primary)]">{d.domain}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {d.authenticated
                      ? t("marketing.email.domains.statusAuthenticated")
                      : d.verified
                        ? t("marketing.email.domains.statusVerified")
                        : t("marketing.email.domains.statusPending")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(d.domain)}
                  className="rounded-full border border-[var(--signal-red)] px-3 py-1 text-xs font-medium text-[var(--signal-red)] hover:bg-[var(--signal-red-soft)]"
                >
                  {t("marketing.email.domains.delete")}
                </button>
              </div>
              {!d.verified && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={codeInputs[d.domain] ?? ""}
                    onChange={(e) =>
                      setCodeInputs((prev) => ({ ...prev, [d.domain]: e.target.value }))
                    }
                    placeholder={t("marketing.email.domains.codePlaceholder")}
                    className="flex-1 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerify(d.domain)}
                    className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
                  >
                    {t("marketing.email.domains.verify")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-[var(--text-tertiary)]">
        {t("marketing.email.domains.dkimHint")}
      </p>
    </article>
  );
}
