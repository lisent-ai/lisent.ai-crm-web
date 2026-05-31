"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FormEvent } from "react";

import { AuthMode } from "@/components/auth/auth-types";
import {
  genderOptions,
  type SignUpProfileFields,
} from "@/lib/auth/sign-up-fields";

type AuthFormCardProps = {
  mode: AuthMode;
  email: string;
  password: string;
  signUpProfile: SignUpProfileFields;
  busy: boolean;
  formErrors: Record<string, string>;
  submitError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignUpProfileChange: (value: SignUpProfileFields) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  // Signin only — switches to the email-OTP sign-in flow.
  onUseOtp?: () => void;
};

function renderFieldError(
  t: ReturnType<typeof useTranslations>,
  raw: string | undefined,
): string {
  if (!raw) return "";
  if (raw.startsWith("validation.")) {
    return t(raw as never);
  }
  return raw;
}

export function AuthFormCard({
  mode,
  email,
  password,
  signUpProfile,
  busy,
  formErrors,
  submitError,
  onEmailChange,
  onPasswordChange,
  onSignUpProfileChange,
  onSubmit,
  onUseOtp,
}: Readonly<AuthFormCardProps>) {
  const t = useTranslations();

  const title = mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle");
  const subtitle =
    mode === "signin" ? t("auth.signInSubtitle") : t("auth.signUpSubtitle");

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 text-violet-50 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300/70">
            {t("auth.workspaceAuth")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-violet-100/60">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-full border border-white/8 bg-white/5 p-1 text-sm font-semibold">
        <Link
          className={`rounded-full px-3 py-2 text-center transition sm:px-4 ${
            mode === "signin"
              ? "bg-violet-400/18 text-white shadow-[0_0_24px_rgba(172,107,255,0.28)]"
              : "text-violet-100/55 hover:text-violet-50"
          }`}
          href="/auth/sign-in"
        >
          {t("auth.signIn")}
        </Link>
        <Link
          className={`rounded-full px-3 py-2 text-center transition sm:px-4 ${
            mode === "signup"
              ? "bg-violet-400/18 text-white shadow-[0_0_24px_rgba(172,107,255,0.28)]"
              : "text-violet-100/55 hover:text-violet-50"
          }`}
          href="/auth/sign-up"
        >
          {t("auth.signUp")}
        </Link>
      </div>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
        {mode === "signup" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-violet-100/80">
                {t("account.fields.firstName")}
              </span>
              <input
                autoComplete="given-name"
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
                name="first_name"
                onChange={(event) =>
                  onSignUpProfileChange({
                    ...signUpProfile,
                    firstName: event.target.value,
                  })
                }
                placeholder={t("account.placeholders.firstName")}
                type="text"
                value={signUpProfile.firstName}
              />
              {formErrors.first_name ? (
                <span className="text-xs text-red-600">
                  {renderFieldError(t, formErrors.first_name)}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-violet-100/80">
                {t("account.fields.lastName")}
              </span>
              <input
                autoComplete="family-name"
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
                name="last_name"
                onChange={(event) =>
                  onSignUpProfileChange({
                    ...signUpProfile,
                    lastName: event.target.value,
                  })
                }
                placeholder={t("account.placeholders.lastName")}
                type="text"
                value={signUpProfile.lastName}
              />
              {formErrors.last_name ? (
                <span className="text-xs text-red-600">
                  {renderFieldError(t, formErrors.last_name)}
                </span>
              ) : null}
            </label>
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-violet-100/80">
            {t("auth.emailLabel")}
          </span>
          <input
            autoComplete="email"
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
            name="email"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            type="email"
            value={email}
          />
          {formErrors.email ? (
            <span className="text-xs text-red-600">
              {renderFieldError(t, formErrors.email)}
            </span>
          ) : null}
        </label>

        {mode === "signup" ? (
          <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-violet-100/80">
                {t("account.fields.phoneNumber")}
              </span>
              <input
                autoComplete="tel"
                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
                name="phone_number"
                onChange={(event) =>
                  onSignUpProfileChange({
                    ...signUpProfile,
                    phoneNumber: event.target.value,
                  })
                }
                placeholder={t("account.placeholders.phoneNumber")}
                type="tel"
                value={signUpProfile.phoneNumber}
              />
              {formErrors.phone_number ? (
                <span className="text-xs text-red-600">
                  {renderFieldError(t, formErrors.phone_number)}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-violet-100/80">
                {t("account.fields.gender")}
              </span>
              <div className="grid grid-cols-2 gap-3">
                {genderOptions.map((option) => {
                  const active = signUpProfile.gender === option.value;

                  return (
                    <button
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "border-violet-300/60 bg-violet-400/18 text-white shadow-[0_0_24px_rgba(168,85,247,0.18)]"
                          : "border-white/10 bg-white/6 text-violet-100/75 hover:border-violet-300/35 hover:bg-white/10"
                      }`}
                      key={option.value}
                      name="gender"
                      onClick={() =>
                        onSignUpProfileChange({
                          ...signUpProfile,
                          gender: option.value as SignUpProfileFields["gender"],
                        })
                      }
                      type="button"
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
              {formErrors.gender ? (
                <span className="text-xs text-red-600">
                  {renderFieldError(t, formErrors.gender)}
                </span>
              ) : null}
            </label>
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-violet-100/80">
            {t("auth.passwordLabel")}
          </span>
          <input
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
            name="password"
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={
              mode === "signin"
                ? t("auth.passwordPlaceholderSignIn")
                : t("auth.passwordPlaceholderSignUp")
            }
            type="password"
            value={password}
          />
          {formErrors.password ? (
            <span className="text-xs text-red-600">
              {renderFieldError(t, formErrors.password)}
            </span>
          ) : null}
        </label>

        {submitError ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {submitError}
          </div>
        ) : null}

        <button
          className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,_rgba(124,58,237,0.96),_rgba(205,98,255,0.92))] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(168,85,247,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy
            ? mode === "signin"
              ? t("auth.signingIn")
              : t("auth.creatingAccount")
            : mode === "signin"
              ? t("auth.signInButton")
              : t("auth.signUpButton")}
        </button>

        {mode === "signin" && onUseOtp ? (
          <button
            type="button"
            onClick={onUseOtp}
            className="-mt-1 text-center text-sm font-medium text-violet-200 underline-offset-4 hover:underline"
          >
            {t("auth.otp.useOtpLink")}
          </button>
        ) : null}
      </form>

      <div className="mt-6 text-sm text-violet-100/60">
        {mode === "signin" ? (
          <>
            {t("auth.newWorkspaceUser")}{" "}
            <Link className="font-semibold text-white" href="/auth/sign-up">
              {t("auth.createAnAccount")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.alreadyHaveAccess")}{" "}
            <Link className="font-semibold text-white" href="/auth/sign-in">
              {t("auth.signInInstead")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
