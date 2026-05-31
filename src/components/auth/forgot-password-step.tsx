"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "supertokens-auth-react/recipe/emailpassword";

type ForgotPasswordStepProps = {
  initialEmail?: string;
  onBack: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Request a password reset: enter email → SuperTokens sends the reset
// link (through our email gateway). Anti-enumeration: a successful
// request always shows the same "if an account exists" message.
export function ForgotPasswordStep({
  initialEmail = "",
  onBack,
}: Readonly<ForgotPasswordStepProps>) {
  const t = useTranslations();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError(t("auth.forgot.error"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await sendPasswordResetEmail({
        formFields: [{ id: "email", value: email }],
      });
      if (res.status === "FIELD_ERROR") {
        setError(
          res.formFields.find((f) => f.id === "email")?.error ??
            t("auth.forgot.error"),
        );
        return;
      }
      // OK or PASSWORD_RESET_NOT_ALLOWED → same neutral confirmation.
      setSent(true);
    } catch {
      setError(t("auth.forgot.error"));
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
        {t("auth.forgot.title")}
      </h2>

      {sent ? (
        <div className="mt-5 grid gap-5">
          <p className="text-sm leading-6 text-violet-100/70">
            {t("auth.forgot.sent", { email })}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="h-12 rounded-full bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            {t("auth.forgot.backToSignin")}
          </button>
        </div>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <p className="text-sm leading-6 text-violet-100/60">
            {t("auth.forgot.subtitle")}
          </p>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-violet-100/80">
              {t("auth.emailLabel")}
            </span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="h-12 rounded-2xl border border-white/15 bg-white/5 px-4 text-white outline-none transition focus:border-violet-300/60 focus:bg-white/10"
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-12 rounded-full bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
          >
            {busy ? t("auth.forgot.sending") : t("auth.forgot.send")}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-center text-sm font-medium text-violet-200 underline-offset-4 hover:underline"
          >
            {t("auth.forgot.backToSignin")}
          </button>
        </form>
      )}
    </div>
  );
}
