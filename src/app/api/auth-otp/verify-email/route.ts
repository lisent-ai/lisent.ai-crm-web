import type { NextRequest } from "next/server";
import supertokens from "supertokens-node";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { withSession } from "supertokens-node/nextjs";

import { verifyOtp, type VerifyResult } from "@/lib/auth/otp/store";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export const dynamic = "force-dynamic";

// POST /api/auth-otp/verify-email  { code: "123456" }
// Verifies the signup email-verification OTP for the current session's
// user and, on success, marks the email verified in SuperTokens.
function statusFor(result: VerifyResult): string {
  switch (result) {
    case "ok":
      return "OK";
    case "invalid":
      return "INVALID_CODE";
    case "expired":
      return "EXPIRED";
    case "too_many_attempts":
      return "TOO_MANY_ATTEMPTS";
    case "no_code":
      return "NO_CODE";
  }
}

export async function POST(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ status: "ERROR" }, { status: 500 });
    }
    if (session === undefined) {
      return Response.json({ status: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ status: "INVALID_CODE" });
    }

    const userId = session.getUserId();
    const result = await verifyOtp(userId, "email_verify", code);
    if (result !== "ok") {
      return Response.json({ status: statusFor(result) });
    }

    // Mark verified in SuperTokens by creating + immediately consuming a
    // verification token (the supported way to flag verified server-side).
    const tenantId = session.getTenantId();
    const recipeUserId = supertokens.convertToRecipeUserId(userId);
    const user = await supertokens.getUser(userId);
    const email = user?.emails[0];
    if (email) {
      const tokenRes = await EmailVerification.createEmailVerificationToken(
        tenantId,
        recipeUserId,
        email,
      );
      if (tokenRes.status === "OK") {
        await EmailVerification.verifyEmailUsingToken(tenantId, tokenRes.token);
      }
    }

    // Refresh the email-verification claim on the live session so guards
    // see the new state without a re-login.
    try {
      await session.fetchAndSetClaim(EmailVerification.EmailVerificationClaim);
    } catch {
      // non-fatal — app-level gating reads the account profile too
    }

    return Response.json({ status: "OK" });
  });
}
