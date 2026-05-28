"use client";

import { useEffect, useState } from "react";

import {
  CRMClientError,
  listMailchimpAudiences,
  pushAgenciesToMailchimp,
  type Agency,
  type AgencyPushResponse,
  type MailchimpAudience,
} from "@/lib/crm/client";

type AgencyPushDialogProps = {
  companyId: string;
  selected: Agency[];
  onClose: () => void;
  onPushed: (summary: AgencyPushResponse) => void;
};

const inputClass =
  "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]";

// AgencyPushDialog — fan out the selected agencies to one Mailchimp
// audience. Two states the operator might be in:
//
//   1. Mailchimp not connected — listMailchimpAudiences returns a
//      404-ish error. We surface that with a link back to the Email
//      module's settings tab so the operator can connect first.
//
//   2. Connected, no audiences yet — empty picker; operator can switch
//      to the Email > Audiences tab to create one.
//
// Push semantics match the leads push:
//   - skipped: agency has no email
//   - error: Mailchimp rejected (bad email shape, blocked address, …)
//   - created / updated: success
//
// update_existing defaults to true so re-running a push patches the
// existing row instead of erroring on duplicate emails.
export function AgencyPushDialog({
  companyId,
  selected,
  onClose,
  onPushed,
}: Readonly<AgencyPushDialogProps>) {
  const [audiences, setAudiences] = useState<MailchimpAudience[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [audiencesError, setAudiencesError] = useState<string | null>(null);
  const [listId, setListId] = useState("");
  const [extraTagsRaw, setExtraTagsRaw] = useState("");
  const [updateExisting, setUpdateExisting] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState<
    "subscribed" | "pending" | "unsubscribed"
  >("subscribed");
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [result, setResult] = useState<AgencyPushResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingAudiences(true);
    listMailchimpAudiences(companyId, { count: 100 })
      .then((res) => {
        if (cancelled) return;
        setAudiences(res.lists ?? []);
        if ((res.lists ?? []).length > 0) {
          setListId(res.lists[0].id);
        }
        setAudiencesError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof CRMClientError
            ? err.status === 404
              ? "Mailchimp isn't connected yet for this account. Connect under Marketing → Email → Settings, then come back."
              : err.message
            : err instanceof Error
              ? err.message
              : "Failed to load Mailchimp audiences.";
        setAudiencesError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingAudiences(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const eligible = selected.filter((a) => (a.email ?? "").trim().length > 0);
  const skipped = selected.length - eligible.length;

  async function handlePush() {
    setPushError(null);
    setResult(null);
    if (!listId) {
      setPushError("Pick an audience first.");
      return;
    }
    if (eligible.length === 0) {
      setPushError("None of the selected agencies has an email address.");
      return;
    }
    const extraTags = extraTagsRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setPushing(true);
    try {
      const res = await pushAgenciesToMailchimp(companyId, {
        list_id: listId,
        agency_ids: selected.map((a) => a.id),
        update_existing: updateExisting,
        extra_tags: extraTags,
        default_status: defaultStatus,
      });
      setResult(res);
      onPushed(res);
    } catch (err) {
      setPushError(
        err instanceof CRMClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "The push failed.",
      );
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Push {selected.length} {selected.length === 1 ? "agency" : "agencies"} to Mailchimp
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Each agency becomes a Mailchimp subscriber. Name maps to FNAME,
              contact to LNAME, phone to PHONE. The tag{" "}
              <code className="rounded bg-[var(--surface-subtle)] px-1 py-0.5">
                source:crm-agency
              </code>{" "}
              is added automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            Close
          </button>
        </header>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          {skipped > 0 && (
            <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {skipped} of the selected{" "}
              {skipped === 1 ? "agency has" : "agencies have"} no email and will be skipped.
            </div>
          )}

          {audiencesError ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-3 py-2 text-sm text-[var(--signal-red)]">
              {audiencesError}
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                Mailchimp audience
              </span>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className={inputClass}
                disabled={loadingAudiences}
              >
                {loadingAudiences && <option>Loading…</option>}
                {!loadingAudiences && audiences.length === 0 && (
                  <option value="">— No audiences yet —</option>
                )}
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              Extra tags
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Added to every pushed subscriber on top of each agency&apos;s own
              tags. Comma or semicolon separated.
            </span>
            <input
              type="text"
              value={extraTagsRaw}
              onChange={(e) => setExtraTagsRaw(e.target.value)}
              placeholder="campaign:spring-2026, region:eu"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              Default status for new subscribers
            </span>
            <select
              value={defaultStatus}
              onChange={(e) =>
                setDefaultStatus(
                  e.target.value as "subscribed" | "pending" | "unsubscribed",
                )
              }
              className={inputClass}
            >
              <option value="subscribed">Subscribed</option>
              <option value="pending">Pending (double opt-in)</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            <span>
              Patch existing subscribers (recommended). Re-running this push
              updates merge fields instead of erroring on duplicates.
            </span>
          </label>

          {result && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
              <div className="font-medium text-[var(--text-primary)]">
                Push complete
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {result.created} created · {result.updated} updated ·{" "}
                {result.skipped} skipped · {result.errors} errors.
              </div>
              {result.errors > 0 && (
                <ul className="mt-1 max-h-32 overflow-auto text-xs text-[var(--signal-red)]">
                  {result.results
                    .filter((r) => r.status === "error")
                    .slice(0, 25)
                    .map((r) => (
                      <li key={r.agency_id}>
                        {r.email ?? r.agency_id}: {r.reason}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3">
          {pushError ? (
            <span className="text-xs text-[var(--signal-red)]">{pushError}</span>
          ) : (
            <span className="text-xs text-[var(--text-tertiary)]">
              {eligible.length} of {selected.length} will be pushed.
            </span>
          )}
          <div className="flex gap-2">
            {result ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                disabled={pushing || !listId || eligible.length === 0}
                onClick={handlePush}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                {pushing ? "Pushing…" : "Push to Mailchimp"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
