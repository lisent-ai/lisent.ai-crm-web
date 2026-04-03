import SuperTokens from "supertokens-node";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import { normalizeCompanyRole, type CompanyRole } from "@/lib/auth/roles";

export type CompanyMembership = {
  companyId: string;
  role: CompanyRole;
  createdAt: string;
  updatedAt: string;
};

export type CompanyMemberRecord = CompanyMembership & {
  userId: string;
};

const METADATA_KEY = "companyMemberships";

function normalizeMembership(raw: unknown): CompanyMembership | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const companyId =
    typeof (raw as { companyId?: unknown }).companyId === "string"
      ? (raw as { companyId: string }).companyId.trim()
      : "";
  const role = normalizeCompanyRole((raw as { role?: unknown }).role);
  const createdAt =
    typeof (raw as { createdAt?: unknown }).createdAt === "string"
      ? (raw as { createdAt: string }).createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof (raw as { updatedAt?: unknown }).updatedAt === "string"
      ? (raw as { updatedAt: string }).updatedAt
      : createdAt;

  if (!companyId || role === null) {
    return null;
  }

  return { companyId, role, createdAt, updatedAt };
}

export async function getCompanyMemberships(
  userId: string,
): Promise<CompanyMembership[]> {
  const response = await UserMetadata.getUserMetadata(userId);
  const rawMemberships = response.metadata?.[METADATA_KEY];
  if (!Array.isArray(rawMemberships)) {
    return [];
  }

  return rawMemberships
    .map(normalizeMembership)
    .filter((membership): membership is CompanyMembership => membership !== null);
}

async function setCompanyMemberships(
  userId: string,
  memberships: CompanyMembership[],
) {
  await UserMetadata.updateUserMetadata(userId, {
    [METADATA_KEY]: memberships,
  });
}

export async function addCompanyMembership(
  userId: string,
  membership: Pick<CompanyMembership, "companyId" | "role">,
) {
  const memberships = await getCompanyMemberships(userId);
  if (memberships.some((item) => item.companyId === membership.companyId)) {
    return memberships;
  }

  const nextMemberships = [
    ...memberships,
    {
      ...membership,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  await setCompanyMemberships(userId, nextMemberships);
  return nextMemberships;
}

export async function getCompanyMembership(userId: string, companyId: string) {
  const memberships = await getCompanyMemberships(userId);
  return memberships.find((membership) => membership.companyId === companyId) ?? null;
}

export async function updateCompanyMembershipRole(
  userId: string,
  companyId: string,
  role: CompanyRole,
) {
  const memberships = await getCompanyMemberships(userId);
  const nextMemberships = memberships.map((membership) =>
    membership.companyId === companyId
      ? {
          ...membership,
          role,
          updatedAt: new Date().toISOString(),
        }
      : membership,
  );
  await setCompanyMemberships(userId, nextMemberships);
  return nextMemberships.find((membership) => membership.companyId === companyId) ?? null;
}

export async function removeCompanyMembership(userId: string, companyId: string) {
  const memberships = await getCompanyMemberships(userId);
  const nextMemberships = memberships.filter((item) => item.companyId !== companyId);
  await setCompanyMemberships(userId, nextMemberships);
  return nextMemberships;
}

export async function listCompanyMembers(
  companyId: string,
): Promise<CompanyMemberRecord[]> {
  const members: CompanyMemberRecord[] = [];
  let paginationToken: string | undefined;

  do {
    const page = await SuperTokens.getUsersOldestFirst({
      tenantId: "public",
      limit: 100,
      paginationToken,
    });

    const metadataEntries = await Promise.all(
      page.users.map(async (user) => ({
        userId: user.id,
        response: await UserMetadata.getUserMetadata(user.id),
      })),
    );

    for (const entry of metadataEntries) {
      const rawMemberships = entry.response.metadata?.[METADATA_KEY];
      if (!Array.isArray(rawMemberships)) {
        continue;
      }

      const memberships = rawMemberships
        .map(normalizeMembership)
        .filter((membership): membership is CompanyMembership => membership !== null);
      const membership = memberships.find((item) => item.companyId === companyId);
      if (!membership) {
        continue;
      }

      members.push({
        userId: entry.userId,
        ...membership,
      });
    }

    paginationToken = page.nextPaginationToken;
  } while (paginationToken);

  return members;
}

export async function removeCompanyFromAllMembers(companyId: string) {
  const members = await listCompanyMembers(companyId);
  await Promise.all(
    members.map((member) => removeCompanyMembership(member.userId, companyId)),
  );
}

export async function canAccessCompany(userId: string, companyId: string) {
  const memberships = await getCompanyMemberships(userId);
  return memberships.some((membership) => membership.companyId === companyId);
}

export async function getAllowedCompanyIds(userId: string) {
  const memberships = await getCompanyMemberships(userId);
  return memberships.map((membership) => membership.companyId);
}
