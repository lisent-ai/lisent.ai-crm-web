import { NextResponse, type NextRequest } from "next/server";
import supertokens from "supertokens-node";
import EmailVerification from "supertokens-node/recipe/emailverification";
import Session from "supertokens-node/recipe/session";
import { withPreParsedRequestResponse } from "supertokens-node/nextjs";

import { verifyOtp, type VerifyResult } from "@/lib/auth/otp/store";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export const dynamic = "force-dynamic";

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

// POST /api/auth-otp/signin/verify  { email, code }
// Verifies a sign-in OTP and, on success, opens a session for the EXISTING
// EmailPassword user (same userId → roles/memberships intact, no account
// linking). OTP login also marks the email verified, since the user just
// proved inbox access.
export async function POST(request: NextRequest) {
  ensureBackendSuperTokensInit(request);

  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    code?: unknown;
  };
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ status: "INVALID_CODE" });
  }

  const users = await supertokens.listUsersByAccountInfo("public", { email });
  const user = users.find((u) =>
    u.loginMethods.some((lm) => lm.recipeId === "emailpassword"),
  );
  // Don't reveal whether the account exists — same response as a bad code.
  if (!user) {
    return NextResponse.json({ status: "INVALID_CODE" });
  }

  const result = await verifyOtp(user.id, "signin", code);
  if (result !== "ok") {
    return NextResponse.json({ status: statusFor(result) });
  }

  const loginMethod = user.loginMethods.find(
    (lm) => lm.recipeId === "emailpassword",
  );
  const recipeUserId =
    loginMethod?.recipeUserId ?? supertokens.convertToRecipeUserId(user.id);
  const tenantId = user.tenantIds[0] ?? "public";
  const verifiedEmail = loginMethod?.email ?? email;

  // Mark verified — OTP login demonstrates control of the inbox.
  try {
    const tokenRes = await EmailVerification.createEmailVerificationToken(
      tenantId,
      recipeUserId,
      verifiedEmail,
    );
    if (tokenRes.status === "OK") {
      await EmailVerification.verifyEmailUsingToken(tenantId, tokenRes.token);
    }
  } catch {
    // non-fatal
  }

  // Create the session on a collecting response; the wrapper transfers the
  // Set-Cookie headers onto the NextResponse we return.
  return withPreParsedRequestResponse(request, async (baseReq, baseRes) => {
    await Session.createNewSession(baseReq, baseRes, tenantId, recipeUserId);
    return NextResponse.json({ status: "OK" });
  });
}
