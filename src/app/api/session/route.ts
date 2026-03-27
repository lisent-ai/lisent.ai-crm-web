import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export async function GET(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json(
        { error: error.message ?? "session validation failed" },
        { status: 500 },
      );
    }

    if (session === undefined) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      userId: session.getUserId(),
      accessTokenPayload: session.getAccessTokenPayload(),
    });
  });
}
