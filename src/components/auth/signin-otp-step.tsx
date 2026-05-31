"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { OtpCodeInput } from "@/components/auth/otp-code-input";

type SigninOtpStepProps = {
  initialEmail?: string;
  onAuthenticated: () => void;
  onUsePassword: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Two-step email-OTP sign-in: enter email → enter the 6-digit code we mail.
// Resolves to the EXISTING EmailPassword account (same userId) so roles
// carry over. Shares OtpCodeInput + the robust auto-submit guard.
export function SigninOtpStep({
  initialEmail = "",
  onAuthenticated,
  onUsePassword,
}: Readonly<SigninOtpStepProps>) {
  const t = useTranslations();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const lastSubmittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function messageFor(status: string): string {
    switch (status) {
      case "INVALID_CODE":
        return t("auth.otp.invalid");
      case "EXPIRED":
        return t("auth.otp.expired");
      case "TOO_MANY_ATTEMPTS":
        return t("auth.otp.tooMany");
      case "NO_CODE":
        return t("auth.otp.noCode");
      default:
        return t("auth.otp.genericError");
    }
  }

  // Always-OK request (anti-enumeration). Used for the initial send and
  // for resend.
  const sendRequest = useCallback(async (): Promise<boolean> => {
    try {
      await fetch("/api/auth-otp/signin/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      return true;
    } catch {
      setError(t("auth.otp.genericError"));
      return false;
    }
  }, [email, t]);

  async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError(t("auth.otp.genericError"));
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const ok = await sendRequest();
    setBusy(false);
    if (ok) {
      setStep("code");
      setCode("");
      lastSubmittedRef.current = null;
      setCooldown(60);
    }
  }

  const submitCode = useCallback(
    async (candidate: string) => {
      if (candidate.length !== 6) {
        setError(t("auth.otp.incomplete"));
        return;
      }
      if (lastSubmittedRef.current === candidate) return;
      lastSubmittedRef.current = candidate;
      setBusy(true);
      setError(null);
      setInfo(null);
      try {
        const res = await fetch("/api/auth-otp/signin/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, code: candidate }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          status?: string;
        };
        if (json.status === "OK") {
          onAuthenticated();
          return;
        }
        setError(messageFor(json.status ?? ""));
        setCode("");
        lastSubmittedRef.current = null;
      } catch {
        setError(t("auth.otp.genericError"));
        setCode("");
        lastSubmittedRef.current = null;
      } finally {
        setBusy(false);
      }
      // messageFor/onAuthenticated/t are stable for this handler.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [email, onAuthenticated, t],
  );

  useEffect(() => {
    if (step === "code" && code.length === 6 && !busy) {
      void submitCode(code);
    }
  }, [step, code, busy, submitCode]);

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const ok = await sendRequest();
    setBusy(false);
    if (ok) {
      setInfo(t("auth.otp.resent"));
      setCooldown(60);
      setCode("");
      lastSubmittedRef.current = null;
    }
  }

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5 text-violet-50 shadow-[0_18px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[1.8rem] sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300/70">
        {t("auth.workspaceAuth")}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {t("auth.otp.signin.emailTitle")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-violet-100/60">
        {step === "email"
          ? t("auth.otp.signin.emailSubtitle")
          : t("auth.otp.signin.codeSubtitle", { email })}
      </p>

      {step === "email" ? (
        <form className="mt-7 grid gap-4" onSubmit={handleRequestSubmit}>
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
            {busy ? t("auth.otp.signin.sending") : t("auth.otp.signin.sendCode")}
          </button>
          <button
            type="button"
            onClick={onUsePassword}
            className="text-center text-sm font-medium text-violet-200 underline-offset-4 hover:underline"
          >
            {t("auth.otp.usePassword")}
          </button>
        </form>
      ) : (
        <div className="mt-7 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-violet-100/80">
              {t("auth.otp.codeLabel")}
            </span>
            <OtpCodeInput value={code} onChange={setCode} disabled={busy} />
          </label>

          {error && <p className="text-sm text-rose-300">{error}</p>}
          {info && !error && <p className="text-sm text-emerald-300">{info}</p>}

          <button
            type="button"
            onClick={() => void submitCode(code)}
            disabled={busy || code.length !== 6}
            className="mt-1 h-12 rounded-full bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
          >
            {busy ? t("auth.otp.verifying") : t("auth.otp.verifyButton")}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => void resend()}
              disabled={cooldown > 0 || busy}
              className="font-medium text-violet-200 underline-offset-4 hover:underline disabled:opacity-50"
            >
              {cooldown > 0
                ? t("auth.otp.resendIn", { seconds: cooldown })
                : t("auth.otp.resend")}
            </button>
            <button
              type="button"
              onClick={onUsePassword}
              className="text-violet-100/50 underline-offset-4 hover:underline"
            >
              {t("auth.otp.usePassword")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
