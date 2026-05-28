"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import {
  completeMailchimpConnect,
  CRMClientError,
  MailchimpNotConfiguredError,
  type MailchimpConfig,
} from "@/lib/crm/client";
import { connectMailchimpViaNango, NangoNotConfiguredError } from "@/lib/nango/client";

type MailchimpConnectModalProps = {
  companyId: string;
  operatorEmail?: string;
  onClose: () => void;
  onConnected: (config: MailchimpConfig) => void;
};

// MailchimpConnectModal — single-mode wizard. Unlike Meta there is no
// mock fallback: Mailchimp accounts require live OAuth. The flow is:
//
//   1. operator clicks "Connect Mailchimp"
//   2. we open Nango's Connect popup (oauth.lisent.ai resolves the
//      Mailchimp App credentials + returns a connection_id)
//   3. we POST that connection_id to the BFF, which forwards through
//      to /users/me/mailchimp-connect-complete with X-Company-Id +
//      X-User-Id, the Go backend reads the access token from Nango,
//      resolves the per-account dc shard, and persists the row
//   4. on success we hand the MailchimpConfig to the parent so the panel
//      flips into its "connected" view
//
// Errors get coarse mapping: Nango misconfig → friendly "ask admin"
// banner; everything else → raw message so the operator can paste it
// in a support thread.
export function MailchimpConnectModal({
  companyId,
  operatorEmail,
  onClose,
  onConnected,
}: Readonly<MailchimpConnectModalProps>) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startConnect = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const { connectionId, providerConfigKey } = await connectMailchimpViaNango(
        companyId,
        operatorEmail,
      );
      const config = await completeMailchimpConnect(companyId, {
        connectionId,
        providerConfigKey,
      });
      onConnected(config);
    } catch (err) {
      if (
        err instanceof NangoNotConfiguredError ||
        err instanceof MailchimpNotConfiguredError
      ) {
        setError(t("integrations.mailchimp.nangoNotConfigured"));
        return;
      }
      setError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("integrations.mailchimp.connectFailed"),
      );
    } finally {
      setBusy(false);
    }
  }, [companyId, operatorEmail, onConnected, t]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {t("integrations.mailchimp.connectTitle")}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("integrations.mailchimp.connectDescription")}
          </p>
        </header>

        {error && (
          <p className="mb-4 rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--signal-red)]">
            {error}
          </p>
        )}

        <ul className="mb-5 space-y-2 text-sm text-[var(--text-secondary)]">
          <li>• {t("integrations.mailchimp.benefitAudiences")}</li>
          <li>• {t("integrations.mailchimp.benefitCampaigns")}</li>
          <li>• {t("integrations.mailchimp.benefitReports")}</li>
          <li>• {t("integrations.mailchimp.benefitPerUser")}</li>
        </ul>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
            onClick={onClose}
            disabled={busy}
          >
            {t("integrations.mailchimp.cancel")}
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
            onClick={startConnect}
            disabled={busy}
          >
            {busy
              ? t("integrations.mailchimp.connecting")
              : t("integrations.mailchimp.connectButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
