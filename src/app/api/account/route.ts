import { NextRequest } from "next/server";
import SuperTokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import {
  buildAccountDisplayName,
  normalizeAccountProfile,
  validateAccountProfileInput,
} from "@/lib/auth/account-profile";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

ensureBackendSuperTokensInit();

async function loadAccountResponse(userId: string) {
  const [user, metadataResponse] = await Promise.all([
    SuperTokens.getUser(userId),
    UserMetadata.getUserMetadata(userId),
  ]);

  if (!user) {
    return null;
  }

  const email = user.emails[0]?.trim() ?? "";
  const profile = normalizeAccountProfile(metadataResponse.metadata?.profile);

  return {
    userId,
    email,
    ...profile,
    displayName: buildAccountDisplayName({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email,
      userId,
    }),
  };
}

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

    const account = await loadAccountResponse(session.getUserId());
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

    const account = await loadAccountResponse(session.getUserId());
    if (!account) {
      return Response.json({ error: "user not found" }, { status: 404 });
    }

    return Response.json(account);
  });
}
