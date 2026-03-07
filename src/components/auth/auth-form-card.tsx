"use client";

import Link from "next/link";
import { FormEvent } from "react";

import { AuthMode } from "@/components/auth/auth-types";

type AuthFormCardProps = {
  mode: AuthMode;
  email: string;
  password: string;
  busy: boolean;
  formErrors: Record<string, string>;
  submitError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthFormCard({
  mode,
  email,
  password,
  busy,
  formErrors,
  submitError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Readonly<AuthFormCardProps>) {
  const title =
    mode === "signin" ? "Access your workspace" : "Create your workspace access";
  const subtitle =
    mode === "signin"
      ? "Use the company account details issued to your team."
      : "Start with email and password. Tenant assignment comes next.";

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-7 text-violet-50 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300/70">
            Workspace auth
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-violet-100/60">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-full border border-white/8 bg-white/5 p-1 text-sm font-semibold">
        <Link
          className={`rounded-full px-4 py-2 text-center transition ${
            mode === "signin"
              ? "bg-violet-400/18 text-white shadow-[0_0_24px_rgba(172,107,255,0.28)]"
              : "text-violet-100/55 hover:text-violet-50"
          }`}
          href="/auth/sign-in"
        >
          Sign in
        </Link>
        <Link
          className={`rounded-full px-4 py-2 text-center transition ${
            mode === "signup"
              ? "bg-violet-400/18 text-white shadow-[0_0_24px_rgba(172,107,255,0.28)]"
              : "text-violet-100/55 hover:text-violet-50"
          }`}
          href="/auth/sign-up"
        >
          Sign up
        </Link>
      </div>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-violet-100/80">Email</span>
          <input
            autoComplete="email"
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
            name="email"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="name@company.com"
            type="email"
            value={email}
          />
          {formErrors.email ? (
            <span className="text-xs text-red-600">{formErrors.email}</span>
          ) : null}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-violet-100/80">Password</span>
          <input
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-violet-100/35 focus:border-violet-300/50 focus:bg-white/10"
            name="password"
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={
              mode === "signin" ? "Enter your password" : "Create a strong password"
            }
            type="password"
            value={password}
          />
          {formErrors.password ? (
            <span className="text-xs text-red-600">{formErrors.password}</span>
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
              ? "Signing in..."
              : "Creating account..."
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-sm text-violet-100/60">
        {mode === "signin" ? (
          <>
            New workspace user?{" "}
            <Link className="font-semibold text-white" href="/auth/sign-up">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have access?{" "}
            <Link className="font-semibold text-white" href="/auth/sign-in">
              Sign in instead
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
