import SuperTokens from "supertokens-node";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import {
  buildAccountDisplayName,
  normalizeAccountProfile,
  type AccountAccessSummary,
  type AccountProfile,
} from "@/lib/auth/account-profile";
import { getCompanyMemberships } from "@/lib/auth/company-memberships";
import { getPlatformRole } from "@/lib/auth/platform-role";

export type AccountIdentity = Omit<AccountProfile, "access">;

export async function loadAccountIdentity(
  userId: string,
): Promise<AccountIdentity | null> {
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

export async function loadAccountProfile(
  userId: string,
): Promise<AccountProfile | null> {
  const identity = await loadAccountIdentity(userId);
  if (!identity) {
    return null;
  }

  const [platformRole, companyMemberships] = await Promise.all([
    getPlatformRole({ userId, email: identity.email }),
    getCompanyMemberships(userId),
  ]);

  const access: AccountAccessSummary = {
    platformRole,
    isSuperAdmin: platformRole === "super_admin",
    companyMemberships: companyMemberships.map((membership) => ({
      companyId: membership.companyId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    })),
  };

  return {
    ...identity,
    access,
  };
}
