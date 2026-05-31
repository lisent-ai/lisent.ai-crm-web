import type { NextRequest } from "next/server";
import supertokens from "supertokens-node";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import { sendSigninOtp } from "@/lib/auth/otp/email";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export const dynamic = "force-dynamic";

// POST /api/auth-otp/signin/request  { email }
// Sends a sign-in OTP to an existing EmailPassword account. ALWAYS returns
// OK regardless of whether the email exists (anti-enumeration); a code is
// only actually sent for a real account. Throttling lives in the OTP store.
export async function POST(request: NextRequest) {
  ensureBackendSuperTokensInit(request);

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    try {
      const users = await supertokens.listUsersByAccountInfo("public", {
        email,
      });
      const user = users.find((u) =>
        u.loginMethods.some((lm) => lm.recipeId === "emailpassword"),
      );
      if (user) {
        let language: string | undefined;
        try {
          const md = await UserMetadata.getUserMetadata(user.id);
          language = (
            md.metadata?.profile as { language?: string } | undefined
          )?.language;
        } catch {
          // default locale
        }
        await sendSigninOtp({ userId: user.id, email, language });
      }
    } catch (err) {
      console.error("[auth] signin OTP request failed", err);
    }
  }

  return Response.json({ status: "OK" });
}
