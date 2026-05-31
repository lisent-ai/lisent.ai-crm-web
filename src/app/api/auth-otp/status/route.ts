import type { NextRequest } from "next/server";
import supertokens from "supertokens-node";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { withSession } from "supertokens-node/nextjs";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export const dynamic = "force-dynamic";

// GET /api/auth-otp/status → { emailVerified, email }
// Lightweight signal the auth UI uses to decide whether to show the
// email-verification OTP step. Avoids threading emailVerified through the
// shared AccountProfile type.
export async function GET(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ emailVerified: null }, { status: 500 });
    }
    if (session === undefined) {
      return Response.json({ emailVerified: null }, { status: 401 });
    }
    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    const email = user?.emails[0] ?? null;
    const emailVerified = email
      ? await EmailVerification.isEmailVerified(
          supertokens.convertToRecipeUserId(userId),
          email,
        )
      : false;
    return Response.json({ emailVerified, email });
  });
}
