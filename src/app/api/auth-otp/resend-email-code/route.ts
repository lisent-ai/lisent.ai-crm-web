import type { NextRequest } from "next/server";
import supertokens from "supertokens-node";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import { withSession } from "supertokens-node/nextjs";

import { clientIpFrom } from "@/lib/auth/client-ip";
import { sendEmailVerifyOtp } from "@/lib/auth/otp/email";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export const dynamic = "force-dynamic";

// POST /api/auth-otp/resend-email-code
// Re-issues + emails the signup verification OTP for the current user.
// Throttled in the OTP store (60s) so it can't spam the inbox.
export async function POST(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ status: "ERROR" }, { status: 500 });
    }
    if (session === undefined) {
      return Response.json({ status: "UNAUTHORIZED" }, { status: 401 });
    }

    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    const email = user?.emails[0];
    if (!email) {
      return Response.json({ status: "ERROR" }, { status: 400 });
    }

    let language: string | undefined;
    try {
      const md = await UserMetadata.getUserMetadata(userId);
      language = (md.metadata?.profile as { language?: string } | undefined)
        ?.language;
    } catch {
      // fall back to default locale
    }

    const res = await sendEmailVerifyOtp({
      userId,
      email,
      language,
      clientIp: clientIpFrom(request),
    });
    if (!res.sent) {
      return Response.json({
        status: "THROTTLED",
        retryAfterSeconds: res.throttledSeconds ?? 60,
      });
    }
    return Response.json({ status: "OK" });
  });
}
