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
import { doesSessionExist } from "supertokens-auth-react/recipe/session";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthShell } from "@/components/auth/auth-shell";
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

      router.replace("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("auth.authFailed");
      setSubmitError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      {mounted ? (
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
