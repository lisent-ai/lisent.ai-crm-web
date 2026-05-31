"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { signIn, signUp } from "supertokens-auth-react/recipe/emailpassword";
import {
  doesSessionExist,
  signOut,
} from "supertokens-auth-react/recipe/session";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailStep } from "@/components/auth/verify-email-step";
import {
  mapFieldErrors,
  resolveMode,
} from "@/components/auth/auth-types";
import {
  emptySignUpProfileFields,
  type SignUpProfileFields,
} from "@/lib/auth/sign-up-fields";
import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

export function AuthPage() {
  ensureFrontendSuperTokensInit();

  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const mode = useMemo(() => resolveMode(pathname), [pathname]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUpProfile, setSignUpProfile] = useState<SignUpProfileFields>(
    emptySignUpProfileFields,
  );
  const [busy, setBusy] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  // After a successful sign-in/up we may need the email-verification OTP
  // step before entering the app.
  const [phase, setPhase] = useState<"form" | "verify">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!mounted) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const hasSession = await doesSessionExist();
      if (!cancelled && hasSession) {
        router.replace("/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, router]);

  useEffect(() => {
    setFormErrors({});
    setSubmitError(null);
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormErrors({});
    setSubmitError(null);

    try {
      const formFields = [
        { id: "email", value: email },
        { id: "password", value: password },
      ];

      if (mode === "signin") {
        const response = await signIn({ formFields });

        if (response.status === "FIELD_ERROR") {
          setFormErrors(mapFieldErrors(response.formFields));
          return;
        }

        if (response.status === "WRONG_CREDENTIALS_ERROR") {
          setSubmitError(t("auth.wrongCredentials"));
          return;
        }

        if (response.status === "SIGN_IN_NOT_ALLOWED") {
          setSubmitError(response.reason);
          return;
        }
      } else {
        const response = await signUp({
          formFields: [
            ...formFields,
            { id: "first_name", value: signUpProfile.firstName },
            { id: "last_name", value: signUpProfile.lastName },
            { id: "phone_number", value: signUpProfile.phoneNumber },
            { id: "gender", value: signUpProfile.gender },
          ],
        });

        if (response.status === "FIELD_ERROR") {
          setFormErrors(mapFieldErrors(response.formFields));
          return;
        }

        if (response.status === "SIGN_UP_NOT_ALLOWED") {
          setSubmitError(response.reason);
          return;
        }
      }

      await proceedAfterAuth();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.authFailed");
      setSubmitError(message);
    } finally {
      setBusy(false);
    }
  }

  // Gate entry on email verification. Signup already triggered an OTP
  // (server-side at signUpPOST); for an unverified sign-in we send a fresh
  // code before showing the step. Verified users go straight to the app.
  async function proceedAfterAuth() {
    try {
      const res = await fetch("/api/auth-otp/status");
      const json = (await res.json().catch(() => ({}))) as {
        emailVerified?: boolean | null;
        email?: string | null;
      };
      if (json.emailVerified === false) {
        setPendingEmail(json.email ?? email);
        if (mode === "signin") {
          await fetch("/api/auth-otp/resend-email-code", { method: "POST" });
        }
        setPhase("verify");
        return;
      }
    } catch {
      // If the status check fails, fall through to the app — the dashboard
      // will surface any session problem.
    }
    router.replace("/dashboard");
  }

  async function handleVerifySignOut() {
    try {
      await signOut();
    } catch {
      // ignore — we reset the local UI regardless
    }
    setPhase("form");
    setPendingEmail("");
    setPassword("");
  }

  return (
    <AuthShell>
      {mounted && phase === "verify" ? (
        <VerifyEmailStep
          email={pendingEmail}
          onVerified={() => router.replace("/dashboard")}
          onSignOut={() => void handleVerifySignOut()}
        />
      ) : mounted ? (
        <AuthFormCard
          busy={busy}
          email={email}
          formErrors={formErrors}
          mode={mode}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSignUpProfileChange={setSignUpProfile}
          onSubmit={(event) => void handleSubmit(event)}
          password={password}
          signUpProfile={signUpProfile}
          submitError={submitError}
        />
      ) : (
        <div className="h-[520px] w-full animate-pulse rounded-[1.8rem] border border-white/10 bg-white/6 backdrop-blur-xl" />
      )}
    </AuthShell>
  );
}
