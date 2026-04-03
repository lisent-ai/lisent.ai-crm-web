import UserMetadata from "supertokens-node/recipe/usermetadata";

import { normalizePlatformRole, type PlatformRole } from "@/lib/auth/roles";

const PLATFORM_ROLE_KEY = "platformRole";

function parseList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function getBootstrapEmails() {
  return new Set(
    [...parseList(process.env.PLATFORM_SUPER_ADMIN_EMAILS)].map((item) =>
      item.toLowerCase(),
    ),
  );
}

function getBootstrapUserIds() {
  return parseList(process.env.PLATFORM_SUPER_ADMIN_USER_IDS);
}

export async function getPlatformRole(input: {
  userId: string;
  email?: string;
}): Promise<PlatformRole | null> {
  const response = await UserMetadata.getUserMetadata(input.userId);
  const fromMetadata = normalizePlatformRole(response.metadata?.[PLATFORM_ROLE_KEY]);
  if (fromMetadata) {
    return fromMetadata;
  }

  const email = input.email?.trim().toLowerCase() ?? "";
  if (
    (email && getBootstrapEmails().has(email)) ||
    getBootstrapUserIds().has(input.userId)
  ) {
    return "super_admin";
  }

  return null;
}
