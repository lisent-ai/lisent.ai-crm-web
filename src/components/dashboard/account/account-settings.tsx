"use client";

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
import { genderOptions, type SignUpProfileFields } from "@/lib/auth/sign-up-fields";

function profileFieldsFromAccount(account: AccountProfile): SignUpProfileFields {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    phoneNumber: account.phoneNumber,
    gender: account.gender,
  };
}

export function AccountSettings() {
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
            : "Failed to load account settings.",
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
  }, []);

  const canSubmit =
    form !== null &&
    !saving &&
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.phoneNumber.trim() !== "" &&
    form.gender !== "";

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
      setSuccessMessage("Account settings saved.");
    } catch (error) {
      if (error instanceof AccountClientError) {
        setFieldErrors(error.fieldErrors);
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to save account settings.");
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

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc,_#eff6ff)] p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700/80">
          Account settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Manage your workspace profile
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          These fields live on the web-auth side in SuperTokens metadata. They
          control how the signed-in user is presented inside the CRM shell.
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Profile summary
          </p>

          {loading || !account ? (
            <div className="mt-5 grid gap-4">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-64 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[1.4rem] bg-slate-100" />
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {account.displayName}
                </p>
                <p className="mt-2 break-all text-sm text-slate-600">
                  {account.email}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SummaryItem label="Phone number" value={account.phoneNumber} />
                <SummaryItem
                  label="Gender"
                  value={
                    genderOptions.find((option) => option.value === account.gender)
                      ?.label ?? "Not set"
                  }
                />
                <SummaryItem
                  label="Platform role"
                  value={account.access.isSuperAdmin ? "Super Admin" : "Workspace User"}
                />
                <SummaryItem
                  label="Company memberships"
                  value={String(account.access.companyMemberships.length)}
                />
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  User id
                </p>
                <p className="mt-2 break-all text-sm text-slate-700">
                  {userJoinedLabel}
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Company access
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {account.access.companyMemberships.length > 0 ? (
                    account.access.companyMemberships.map((membership) => (
                      <span
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        key={`${membership.companyId}-${membership.createdAt}`}
                      >
                        {membership.companyId} · {membership.role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-600">
                      No company memberships yet.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Edit profile
          </p>

          {loading || !form ? (
            <div className="mt-5 grid gap-4">
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Name</span>
                  <input
                    autoComplete="given-name"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                    onChange={(event) => updateField("firstName", event.target.value)}
                    placeholder="Your first name"
                    type="text"
                    value={form.firstName}
                  />
                  {fieldErrors.firstName ? (
                    <span className="text-xs text-rose-700">
                      {fieldErrors.firstName}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Surname</span>
                  <input
                    autoComplete="family-name"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                    onChange={(event) => updateField("lastName", event.target.value)}
                    placeholder="Your surname"
                    type="text"
                    value={form.lastName}
                  />
                  {fieldErrors.lastName ? (
                    <span className="text-xs text-rose-700">
                      {fieldErrors.lastName}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                  readOnly
                  type="email"
                  value={account?.email ?? ""}
                />
                <span className="text-xs text-slate-500">
                  Email changes are not handled on this screen.
                </span>
              </label>

              <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Phone number
                  </span>
                  <input
                    autoComplete="tel"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                    onChange={(event) =>
                      updateField("phoneNumber", event.target.value)
                    }
                    placeholder="+49 555 123 4567"
                    type="tel"
                    value={form.phoneNumber}
                  />
                  {fieldErrors.phoneNumber ? (
                    <span className="text-xs text-rose-700">
                      {fieldErrors.phoneNumber}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <div className="grid grid-cols-2 gap-3">
                    {genderOptions.map((option) => {
                      const active = form.gender === option.value;

                      return (
                        <button
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                            active
                              ? "border-sky-500 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-white"
                          }`}
                          key={option.value}
                          onClick={() => updateField("gender", option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.gender ? (
                    <span className="text-xs text-rose-700">
                      {fieldErrors.gender}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-sm text-slate-500">
                  Changes update the signed-in user profile used by the dashboard.
                </p>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,_#0f172a,_#0f766e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canSubmit}
                  type="submit"
                >
                  {saving ? "Saving..." : "Save settings"}
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
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}
