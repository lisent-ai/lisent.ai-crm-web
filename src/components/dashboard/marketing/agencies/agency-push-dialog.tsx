"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
//      404-ish error. We surface that with a hint back to the Email
//      module's settings tab so the operator can connect first.
//
//   2. Connected, no audiences yet — empty picker; operator can switch
//      to the Email > Audiences tab to create one.
export function AgencyPushDialog({
  companyId,
  selected,
  onClose,
  onPushed,
}: Readonly<AgencyPushDialogProps>) {
  const t = useTranslations();
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
              ? t("marketing.agencies.push.notConnected")
              : err.message
            : err instanceof Error
              ? err.message
              : t("marketing.agencies.push.loadAudiencesFailed");
        setAudiencesError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingAudiences(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  const eligible = selected.filter((a) => (a.email ?? "").trim().length > 0);
  const skipped = selected.length - eligible.length;

  async function handlePush() {
    setPushError(null);
    setResult(null);
    if (!listId) {
      setPushError(t("marketing.agencies.push.pickAudience"));
      return;
    }
    if (eligible.length === 0) {
      setPushError(t("marketing.agencies.push.noEmail"));
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
            : t("marketing.agencies.push.failed"),
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
              {t("marketing.agencies.push.title", { count: selected.length })}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {t("marketing.agencies.push.subtitle", {
                tag: t("marketing.agencies.push.auto"),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            {t("marketing.agencies.push.close")}
          </button>
        </header>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          {skipped > 0 && (
            <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {t("marketing.agencies.push.skippedNotice", { count: skipped })}
            </div>
          )}

          {audiencesError ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--signal-red)] bg-[var(--signal-red-soft)] px-3 py-2 text-sm text-[var(--signal-red)]">
              {audiencesError}
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                {t("marketing.agencies.push.mailchimpAudience")}
              </span>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className={inputClass}
                disabled={loadingAudiences}
              >
                {loadingAudiences && (
                  <option>{t("marketing.agencies.push.loading")}</option>
                )}
                {!loadingAudiences && audiences.length === 0 && (
                  <option value="">
                    {t("marketing.agencies.push.noAudiences")}
                  </option>
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
              {t("marketing.agencies.push.extraTagsLabel")}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {t("marketing.agencies.push.extraTagsHelp")}
            </span>
            <input
              type="text"
              value={extraTagsRaw}
              onChange={(e) => setExtraTagsRaw(e.target.value)}
              placeholder={t("marketing.agencies.push.extraTagsPlaceholder")}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--text-primary)]">
              {t("marketing.agencies.push.defaultStatus")}
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
              <option value="subscribed">
                {t("marketing.agencies.push.statusSubscribed")}
              </option>
              <option value="pending">
                {t("marketing.agencies.push.statusPending")}
              </option>
              <option value="unsubscribed">
                {t("marketing.agencies.push.statusUnsubscribed")}
              </option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            <span>{t("marketing.agencies.push.patchExisting")}</span>
          </label>

          {result && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
              <div className="font-medium text-[var(--text-primary)]">
                {t("marketing.agencies.push.result.header")}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {t("marketing.agencies.push.result.summary", {
                  created: result.created,
                  updated: result.updated,
                  skipped: result.skipped,
                  errors: result.errors,
                })}
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
              {t("marketing.agencies.push.summary", {
                eligible: eligible.length,
                total: selected.length,
              })}
            </span>
          )}
          <div className="flex gap-2">
            {result ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                {t("marketing.agencies.push.done")}
              </button>
            ) : (
              <button
                type="button"
                disabled={pushing || !listId || eligible.length === 0}
                onClick={handlePush}
                className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                {pushing
                  ? t("marketing.agencies.push.pushing")
                  : t("marketing.agencies.push.pushBtn")}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
