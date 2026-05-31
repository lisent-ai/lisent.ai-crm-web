import type { NextRequest } from "next/server";
import Session from "supertokens-node/recipe/session";
import { withSession } from "supertokens-node/nextjs";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

export const dynamic = "force-dynamic";

// POST /api/account/sign-out-all
// Revokes every session for the current user (all devices/browsers). The
// caller then clears its own cookies via signOut() and redirects.
export async function POST(request: NextRequest) {
  ensureBackendSuperTokensInit(request);
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json({ status: "ERROR" }, { status: 500 });
    }
    if (session === undefined) {
      return Response.json({ status: "UNAUTHORIZED" }, { status: 401 });
    }
    await Session.revokeAllSessionsForUser(session.getUserId());
    return Response.json({ status: "OK" });
  });
}
