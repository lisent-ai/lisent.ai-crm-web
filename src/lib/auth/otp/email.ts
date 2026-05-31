import { sendViaGateway } from "@/lib/email/client";
import { renderEmail } from "@/lib/email/render";

import { issueOtp } from "./store";

// Issue + email a fresh email-verification OTP. Shared by the signup
// override and the resend endpoint. Returns throttle info so the resend
// endpoint can tell the user to wait; the signup path ignores throttling
// (it's always the first send for a brand-new user).
export async function sendEmailVerifyOtp(opts: {
  userId: string;
  email: string;
  language?: string;
  clientIp?: string;
}): Promise<{ sent: boolean; throttledSeconds?: number }> {
  const issued = await issueOtp(opts.userId, "email_verify");
  if (!issued.ok) {
    return { sent: false, throttledSeconds: issued.throttledSeconds };
  }
  const rendered = await renderEmail(
    { id: "verify-email-otp", data: { email: opts.email, code: issued.code } },
    opts.language,
  );
  await sendViaGateway({
    to: opts.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    clientIp: opts.clientIp,
    tags: { kind: "verify-email-otp" },
  });
  return { sent: true };
}

// Issue + email a sign-in OTP (Faz 4). Same store, "signin" purpose.
export async function sendSigninOtp(opts: {
  userId: string;
  email: string;
  language?: string;
  clientIp?: string;
}): Promise<{ sent: boolean; throttledSeconds?: number }> {
  const issued = await issueOtp(opts.userId, "signin");
  if (!issued.ok) {
    return { sent: false, throttledSeconds: issued.throttledSeconds };
  }
  const rendered = await renderEmail(
    { id: "signin-otp", data: { email: opts.email, code: issued.code } },
    opts.language,
  );
  await sendViaGateway({
    to: opts.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    clientIp: opts.clientIp,
    tags: { kind: "signin-otp" },
  });
  return { sent: true };
}
