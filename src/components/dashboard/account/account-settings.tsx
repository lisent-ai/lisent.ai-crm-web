"use client";

import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AccountClientError,
  getAccountProfile,
  updateAccountProfile,
} from "@/lib/account/client";
import type {
  AccountProfile,
  AccountProfileFieldErrors,
} from "@/lib/auth/account-profile";
import {
  genderOptions,
  type SignUpProfileFields,
} from "@/lib/auth/sign-up-fields";
import {
  locales,
  localeLabels,
  type SupportedLocale,
} from "@/lib/i18n/config";

function profileFieldsFromAccount(account: AccountProfile): SignUpProfileFields {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    phoneNumber: account.phoneNumber,
    gender: account.gender,
    language: account.language,
  };
}

export function AccountSettings() {
  const t = useTranslations();

  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState<SignUpProfileFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AccountProfileFieldErrors>({});

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const nextAccount = await getAccountProfile();
        if (cancelled) {
          return;
        }

        setAccount(nextAccount);
        setForm(profileFieldsFromAccount(nextAccount));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof AccountClientError
            ? error.message
            : t("account.loadFailed"),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const canSubmit =
    form !== null &&
    !saving &&
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.phoneNumber.trim() !== "" &&
    form.gender !== "" &&
    form.language !== "";

  const userJoinedLabel = useMemo(() => {
    if (!account) {
      return "";
    }

    return account.userId;
  }, [account]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const nextAccount = await updateAccountProfile(form);
      setAccount(nextAccount);
      setForm(profileFieldsFromAccount(nextAccount));
      setSuccessMessage(t("account.saved"));
      // Hard reload (instead of router.refresh) so the new NEXT_LOCALE
      // cookie is committed by the browser before the next request and
      // server-side `getLocale()` re-resolves with the freshly saved
      // account language. router.refresh leaves the SPA shell in place,
      // which can keep stale i18n state on the page after a locale change.
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      if (error instanceof AccountClientError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(error.message || t("account.saveFailed"));
      } else {
        setErrorMessage(t("account.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SignUpProfileFields>(
    key: K,
    value: SignUpProfileFields[K],
  ) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });

    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
    setSuccessMessage(null);
  }

  const genderLabelFor = (value: string): string => {
    const option = genderOptions.find((entry) => entry.value === value);
    return option ? t(option.labelKey) : t("common.notSet");
  };

  return (
    <div className="grid gap-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
            {t("account.profileSummary")}
          </p>

          {loading || !account ? (
            <div className="mt-5 grid gap-4">
              <div className="h-6 w-48 animate-pulse rounded-full bg-[var(--surface-inset)]" />
              <div className="h-4 w-64 animate-pulse rounded-full bg-[var(--surface-inset)]" />
              <div className="h-24 animate-pulse rounded-[var(--radius-card-lg)] bg-[var(--surface-muted)]" />
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {account.displayName}
                </p>
                <p className="mt-2 break-all text-sm text-[var(--text-secondary)]">
                  {account.email}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SummaryItem
                  label={t("account.fields.phoneNumber")}
                  value={account.phoneNumber}
                />
                <SummaryItem
                  label={t("account.fields.gender")}
                  value={genderLabelFor(account.gender)}
                />
                <SummaryItem
                  label={t("account.fields.platformRole")}
                  value={
                    account.access.isSuperAdmin
                      ? t("account.platformRole.superAdmin")
                      : t("account.platformRole.workspaceUser")
                  }
                />
                <SummaryItem
                  label={t("account.fields.companyMemberships")}
                  value={String(account.access.companyMemberships.length)}
                />
              </div>

              <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                  {t("account.fields.userId")}
                </p>
                <p className="mt-2 break-all text-sm text-[var(--text-secondary)]">
                  {userJoinedLabel}
                </p>
              </div>

              <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                  {t("account.fields.companyAccess")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {account.access.companyMemberships.length > 0 ? (
                    account.access.companyMemberships.map((membership) => (
                      <span
                        className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                        key={`${membership.companyId}-${membership.createdAt}`}
                      >
                        {membership.companyId} · {membership.role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">
                      {t("account.noMemberships")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
            {t("account.editProfile")}
          </p>

          {loading || !form ? (
            <div className="mt-5 grid gap-4">
              <div className="h-12 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {t("account.fields.firstName")}
                  </span>
                  <input
                    autoComplete="given-name"
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                    onChange={(event) => updateField("firstName", event.target.value)}
                    placeholder={t("account.placeholders.firstName")}
                    type="text"
                    value={form.firstName}
                  />
                  {fieldErrors.firstName ? (
                    <span className="text-xs text-[var(--signal-red)]">
                      {t(fieldErrors.firstName.key)}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {t("account.fields.lastName")}
                  </span>
                  <input
                    autoComplete="family-name"
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                    onChange={(event) => updateField("lastName", event.target.value)}
                    placeholder={t("account.placeholders.lastName")}
                    type="text"
                    value={form.lastName}
                  />
                  {fieldErrors.lastName ? (
                    <span className="text-xs text-[var(--signal-red)]">
                      {t(fieldErrors.lastName.key)}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("account.fields.email")}
                </span>
                <input
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-4 py-3 text-sm text-[var(--text-tertiary)] outline-none"
                  readOnly
                  type="email"
                  value={account?.email ?? ""}
                />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {t("account.emailNotEditable")}
                </span>
              </label>

              <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {t("account.fields.phoneNumber")}
                  </span>
                  <input
                    autoComplete="tel"
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                    onChange={(event) =>
                      updateField("phoneNumber", event.target.value)
                    }
                    placeholder={t("account.placeholders.phoneNumber")}
                    type="tel"
                    value={form.phoneNumber}
                  />
                  {fieldErrors.phoneNumber ? (
                    <span className="text-xs text-[var(--signal-red)]">
                      {t(fieldErrors.phoneNumber.key)}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {t("account.fields.gender")}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {genderOptions.map((option) => {
                      const active = form.gender === option.value;

                      return (
                        <button
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                              : "border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[color-mix(in_srgb,_var(--accent)_40%,_transparent)] hover:bg-[var(--surface)]"
                          }`}
                          key={option.value}
                          onClick={() => updateField("gender", option.value)}
                          type="button"
                        >
                          {t(option.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.gender ? (
                    <span className="text-xs text-[var(--signal-red)]">
                      {t(fieldErrors.gender.key)}
                    </span>
                  ) : null}
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t("account.fields.language")}
                </span>
                <select
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)]"
                  onChange={(event) =>
                    updateField(
                      "language",
                      event.target.value as SupportedLocale | "",
                    )
                  }
                  value={form.language}
                >
                  <option value="" disabled>
                    {t("account.placeholders.language")}
                  </option>
                  {locales.map((loc) => (
                    <option key={loc} value={loc}>
                      {localeLabels[loc]}
                    </option>
                  ))}
                </select>
                {fieldErrors.language ? (
                  <span className="text-xs text-[var(--signal-red)]">
                    {t(fieldErrors.language.key)}
                  </span>
                ) : null}
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-sm text-[var(--text-tertiary)]">
                  {t("account.changeNote")}
                </p>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canSubmit}
                  type="submit"
                >
                  {saving ? t("account.saving") : t("account.saveButton")}
                </button>
              </div>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
