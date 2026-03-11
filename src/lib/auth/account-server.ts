import SuperTokens from "supertokens-node";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import {
  buildAccountDisplayName,
  normalizeAccountProfile,
  type AccountProfile,
} from "@/lib/auth/account-profile";

export async function loadAccountProfile(
  userId: string,
): Promise<AccountProfile | null> {
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
