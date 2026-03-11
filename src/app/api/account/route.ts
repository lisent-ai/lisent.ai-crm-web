import { NextRequest } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import {
  validateAccountProfileInput,
} from "@/lib/auth/account-profile";
import { loadAccountProfile } from "@/lib/auth/account-server";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

ensureBackendSuperTokensInit();

export async function GET(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json(
        { error: error.message ?? "session validation failed" },
        { status: 500 },
      );
    }

    if (session === undefined) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const account = await loadAccountProfile(session.getUserId());
    if (!account) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    return Response.json(account);
  });
}

export async function PATCH(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return Response.json(
        { error: error.message ?? "session validation failed" },
        { status: 500 },
      );
    }

    if (session === undefined) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { data, fieldErrors } = validateAccountProfileInput(body);

    if (Object.keys(fieldErrors).length > 0) {
      return Response.json(
        {
          error: "Please correct the highlighted account fields.",
          fieldErrors,
        },
        { status: 400 },
      );
    }

    await UserMetadata.updateUserMetadata(session.getUserId(), {
      profile: data,
    });

    const account = await loadAccountProfile(session.getUserId());
    if (!account) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    return Response.json(account);
  });
}
