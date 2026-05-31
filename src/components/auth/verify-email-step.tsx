"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { OtpCodeInput } from "@/components/auth/otp-code-input";

type VerifyEmailStepProps = {
  email: string;
  onVerified: () => void;
  onSignOut: () => void;
};

// Email-verification OTP screen shown right after signup (and on login of
// an unverified account). Renders in place of the auth form, styled to
// match the auth card.
export function VerifyEmailStep({
  email,
  onVerified,
  onSignOut,
}: Readonly<VerifyEmailStepProps>) {
  const t = useTranslations();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  // Guard so the auto-submit effect fires once per completed code.
  const submittingRef = useRef(false);

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

  const verify = useCallback(async () => {
    if (code.length !== 6) {
      setError(t("auth.otp.incomplete"));
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth-otp/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json().catch(() => ({}))) as { status?: string };
      if (json.status === "OK") {
        onVerified();
        return;
      }
      setError(messageFor(json.status ?? ""));
      if (
        json.status === "EXPIRED" ||
        json.status === "TOO_MANY_ATTEMPTS" ||
        json.status === "NO_CODE"
      ) {
        setCode("");
      }
    } catch {
      setError(t("auth.otp.genericError"));
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
    // messageFor/onVerified/t are stable enough for this handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, onVerified, t]);

  // Auto-submit once the 6th digit is entered.
  useEffect(() => {
    if (code.length === 6 && !busy && !submittingRef.current) {
      submittingRef.current = true;
      void verify();
    }
  }, [code, busy, verify]);

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth-otp/resend-email-code", {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        retryAfterSeconds?: number;
      };
      if (json.status === "OK") {
        setInfo(t("auth.otp.resent"));
        setCooldown(60);
        setCode("");
      } else if (json.status === "THROTTLED") {
        setCooldown(json.retryAfterSeconds ?? 60);
      } else {
        setError(t("auth.otp.genericError"));
      }
    } catch {
      setError(t("auth.otp.genericError"));
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
        {t("auth.otp.verifyTitle")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-violet-100/60">
        {t("auth.otp.verifySubtitle", { email })}
      </p>

      <div className="mt-7 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-violet-100/80">
            {t("auth.otp.codeLabel")}
          </span>
          <OtpCodeInput value={code} onChange={setCode} disabled={busy} />
        </label>

        {error && (
          <p className="text-sm text-rose-300">{error}</p>
        )}
        {info && !error && (
          <p className="text-sm text-emerald-300">{info}</p>
        )}

        <button
          type="button"
          onClick={() => void verify()}
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
            onClick={onSignOut}
            className="text-violet-100/50 underline-offset-4 hover:underline"
          >
            {t("auth.otp.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
