"use client";

import { useEffect, useState } from "react";

import {
  CRMClientError,
  completeSheetsOAuth,
  deleteSheetImport,
  disconnectSheets,
  fetchSheetsStatus,
  type SheetImport,
  SheetsOAuthNotConfiguredError,
  type SheetsStatus,
  syncSheetImportNow,
} from "@/lib/crm/client";
import { connectGoogleSheetsViaNango } from "@/lib/nango/client";

import { AddSheetModal } from "./add-sheet-modal";

type Props = {
  companyId: string;
};

// GoogleSheetsConfigPanel is the per-company Google Sheets integration page.
// Three states:
//   • Not connected: shows "Connect Google Sheets" CTA → Nango popup.
//   • Connected, no sheets: shows "Add your first sheet" CTA.
//   • Connected with sheets: lists sheet imports with Sync now / Edit / Delete.
export function GoogleSheetsConfigPanel({ companyId }: Readonly<Props>) {
  const [status, setStatus] = useState<SheetsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    setError(null);
    fetchSheetsStatus(companyId)
      .then((s) => setStatus(s))
      .catch((err) =>
        setError(err instanceof CRMClientError ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    setInfo(null);
    try {
      const popup = await connectGoogleSheetsViaNango(companyId);
      const completed = await completeSheetsOAuth(companyId, popup);
      setInfo(
        completed.oauthUserEmail
          ? `Connected as ${completed.oauthUserEmail}`
          : "Connected",
      );
      reload();
    } catch (err) {
      if (err instanceof SheetsOAuthNotConfiguredError) {
        setError(
          "Google Sheets OAuth gateway is not configured yet. Ask the admin to wire up Nango (NANGO_SECRET_KEY + the google-sheets provider).",
        );
      } else if (err instanceof CRMClientError) {
        setError(err.message);
      } else if (err instanceof Error) {
        // User-cancelled popup throws too. Surface a softer message.
        setError(err.message || "Connection cancelled");
      } else {
        setError("Connection failed");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect Google Sheets? All sheet imports will be removed (existing leads stay in the CRM).",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await disconnectSheets(companyId);
      setInfo("Disconnected");
      reload();
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Disconnect failed");
    }
  }

  async function handleSyncNow(imp: SheetImport) {
    setSyncingId(imp.id);
    setError(null);
    setInfo(null);
    try {
      const result = await syncSheetImportNow(companyId, imp.id);
      if (result.status === "ok") {
        setInfo(
          `Synced ${imp.campaign_label}: ${result.added} new, ${result.updated} updated (${result.total_rows} rows)`,
        );
      } else {
        setError(result.error_message || "Sync returned an error status");
      }
      reload();
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(imp: SheetImport) {
    if (!window.confirm(`Remove "${imp.campaign_label}"? Existing leads stay in CRM.`)) {
      return;
    }
    setError(null);
    try {
      await deleteSheetImport(companyId, imp.id);
      setInfo(`Removed ${imp.campaign_label}`);
      reload();
    } catch (err) {
      setError(err instanceof CRMClientError ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--text-tertiary)] sm:p-8">
        Loading…
      </article>
    );
  }

  const integration = status?.integration ?? null;
  const sheetImports = status?.sheet_imports ?? [];
  const nangoReady = status?.nango_ready ?? false;

  return (
    <article className="flex flex-col gap-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 sm:p-8">
      <header>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Google Sheets
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Sign in with Google, pick a sheet, map columns, and rows are imported as leads.
          Each sheet shows up as a separate campaign in Marketing → Campaigns.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-[color-mix(in_srgb,var(--signal-red)_28%,transparent)] bg-[color-mix(in_srgb,var(--signal-red)_8%,var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-2xl border border-[color-mix(in_srgb,var(--signal-green)_28%,transparent)] bg-[color-mix(in_srgb,var(--signal-green)_8%,var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {info}
        </p>
      )}
      {!nangoReady && (
        <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Nango (the OAuth gateway) is not configured yet. The admin needs to set
          NANGO_SECRET_KEY on the CRM service and add a google-sheets provider in the
          Nango dashboard before this integration can connect.
        </p>
      )}

      {!integration && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting || !nangoReady}
          className="self-start rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect Google Sheets"}
        </button>
      )}

      {integration && (
        <>
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Connected as
                </p>
                <p className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                  {integration.oauth_user_email ?? "(no email — re-connect to populate)"}
                </p>
                {integration.oauth_user_name && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    {integration.oauth_user_name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--signal-red)_40%,transparent)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--signal-red)]"
              >
                Disconnect
              </button>
            </div>
          </section>

          <section>
            <header className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Connected sheets ({sheetImports.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Add sheet
              </button>
            </header>

            {sheetImports.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-tertiary)]">
                No sheets connected yet. Click <strong>Add sheet</strong> to pick a
                spreadsheet from your Drive.
              </p>
            ) : (
              <ul className="grid gap-3">
                {sheetImports.map((imp) => (
                  <li
                    key={imp.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {imp.campaign_label}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {imp.spreadsheet_name} → {imp.sheet_name}
                        </p>
                        <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                          {imp.last_synced_at ? (
                            <>
                              Last synced{" "}
                              {new Date(imp.last_synced_at).toLocaleString()} —{" "}
                              {imp.last_sync_added} added, {imp.last_sync_updated}{" "}
                              updated
                            </>
                          ) : (
                            "Not synced yet"
                          )}
                          {imp.last_sync_status === "error" && imp.last_sync_error && (
                            <>
                              <br />
                              <span className="text-[var(--signal-red)]">
                                Error: {imp.last_sync_error}
                              </span>
                            </>
                          )}
                          {!imp.is_active && (
                            <>
                              {" · "}
                              <span className="text-[var(--signal-red)]">paused</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSyncNow(imp)}
                          disabled={syncingId === imp.id}
                          className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
                        >
                          {syncingId === imp.id ? "Syncing…" : "Sync now"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(imp)}
                          className="rounded-full border border-[color-mix(in_srgb,var(--signal-red)_40%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-red)]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <AddSheetModal
        companyId={companyId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => {
          setShowAddModal(false);
          setInfo("Sheet added — click Sync now to import rows");
          reload();
        }}
      />
    </article>
  );
}
