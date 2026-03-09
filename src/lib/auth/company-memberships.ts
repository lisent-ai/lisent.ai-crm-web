import UserMetadata from "supertokens-node/recipe/usermetadata";

export type CompanyRole = "owner";

export type CompanyMembership = {
  companyId: string;
  role: CompanyRole;
  createdAt: string;
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
  const role =
    (raw as { role?: unknown }).role === "owner" ? "owner" : null;
  const createdAt =
    typeof (raw as { createdAt?: unknown }).createdAt === "string"
      ? (raw as { createdAt: string }).createdAt
      : new Date().toISOString();

  if (!companyId || role === null) {
    return null;
  }

  return { companyId, role, createdAt };
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
    },
  ];
  await setCompanyMemberships(userId, nextMemberships);
  return nextMemberships;
}

export async function removeCompanyMembership(userId: string, companyId: string) {
  const memberships = await getCompanyMemberships(userId);
  const nextMemberships = memberships.filter((item) => item.companyId !== companyId);
  await setCompanyMemberships(userId, nextMemberships);
  return nextMemberships;
}

export async function canAccessCompany(userId: string, companyId: string) {
  const memberships = await getCompanyMemberships(userId);
  return memberships.some((membership) => membership.companyId === companyId);
}

export async function getAllowedCompanyIds(userId: string) {
  const memberships = await getCompanyMemberships(userId);
  return memberships.map((membership) => membership.companyId);
}
