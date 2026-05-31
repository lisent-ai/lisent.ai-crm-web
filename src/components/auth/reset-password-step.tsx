"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { submitNewPassword } from "supertokens-auth-react/recipe/emailpassword";

type ResetPasswordStepProps = {
  onDone: () => void;
};

// Set a new password. The reset token is read from the URL by the SDK's
// submitNewPassword(). Reached via the link in the reset email
// (/auth/reset-password?token=…).
export function ResetPasswordStep({
  onDone,
}: Readonly<ResetPasswordStepProps>) {
  const t = useTranslations();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length === 0) {
      setError(t("auth.reset.error"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await submitNewPassword({
        formFields: [{ id: "password", value: password }],
      });
      if (res.status === "FIELD_ERROR") {
        setError(
          res.formFields.find((f) => f.id === "password")?.error ??
            t("auth.reset.error"),
        );
        return;
      }
      if (res.status === "RESET_PASSWORD_INVALID_TOKEN_ERROR") {
        setError(t("auth.reset.invalidToken"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("auth.reset.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 text-violet-50 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300/70">
        {t("auth.workspaceAuth")}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {t("auth.reset.title")}
      </h2>

      {done ? (
        <div className="mt-5 grid gap-5">
          <p className="text-sm leading-6 text-emerald-300">
            {t("auth.reset.success")}
          </p>
          <button
            type="button"
            onClick={onDone}
            className="h-12 rounded-full bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            {t("auth.reset.signin")}
          </button>
        </div>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <p className="text-sm leading-6 text-violet-100/60">
            {t("auth.reset.subtitle")}
          </p>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-violet-100/80">
              {t("auth.reset.newPassword")}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.reset.placeholder")}
              className="h-12 rounded-2xl border border-white/15 bg-white/5 px-4 text-white outline-none transition focus:border-violet-300/60 focus:bg-white/10"
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-12 rounded-full bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
          >
            {busy ? t("auth.reset.submitting") : t("auth.reset.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
