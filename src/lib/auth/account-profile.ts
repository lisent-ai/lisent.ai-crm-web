import {
  emptySignUpProfileFields,
  type SignUpProfileFields,
  type ValidationError,
  validateFirstName,
  validateGender,
  validateLanguage,
  validateLastName,
  validatePhoneNumber,
} from "@/lib/auth/sign-up-fields";
import type { CompanyRole, PlatformRole } from "@/lib/auth/roles";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";

export type AccountCompanyMembershipSummary = {
  companyId: string;
  role: CompanyRole;
  createdAt: string;
  updatedAt: string;
};

export type AccountAccessSummary = {
  platformRole: PlatformRole | null;
  isSuperAdmin: boolean;
  companyMemberships: AccountCompanyMembershipSummary[];
};

export type AccountProfile = SignUpProfileFields & {
  userId: string;
  email: string;
  displayName: string;
  access: AccountAccessSummary;
};

export type AccountProfileFieldErrors = Partial<
  Record<keyof SignUpProfileFields, ValidationError>
>;

export function normalizeAccountProfile(raw: unknown): SignUpProfileFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptySignUpProfileFields;
  }

  const profile = raw as Partial<Record<keyof SignUpProfileFields, unknown>>;

  const language: SupportedLocale | "" =
    typeof profile.language === "string" && isSupportedLocale(profile.language)
      ? profile.language
      : "";

  return {
    firstName:
      typeof profile.firstName === "string" ? profile.firstName.trim() : "",
    lastName:
      typeof profile.lastName === "string" ? profile.lastName.trim() : "",
    phoneNumber:
      typeof profile.phoneNumber === "string" ? profile.phoneNumber.trim() : "",
    gender:
      profile.gender === "male" || profile.gender === "female"
        ? profile.gender
        : "",
    language,
  };
}

export function buildAccountDisplayName(input: {
  firstName: string;
  lastName: string;
  email?: string;
  userId?: string;
}) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (input.email?.trim()) {
    return input.email.trim();
  }

  return input.userId?.trim() || "Signed-in user";
}

export function validateAccountProfileInput(raw: unknown): {
  data: SignUpProfileFields;
  fieldErrors: AccountProfileFieldErrors;
} {
  const data = normalizeAccountProfile(raw);
  const fieldErrors: AccountProfileFieldErrors = {};

  const firstNameError = validateFirstName(data.firstName);
  if (firstNameError) {
    fieldErrors.firstName = firstNameError;
  }

  const lastNameError = validateLastName(data.lastName);
  if (lastNameError) {
    fieldErrors.lastName = lastNameError;
  }

  const phoneNumberError = validatePhoneNumber(data.phoneNumber);
  if (phoneNumberError) {
    fieldErrors.phoneNumber = phoneNumberError;
  }

  const genderError = validateGender(data.gender);
  if (genderError) {
    fieldErrors.gender = genderError;
  }

  const languageError = validateLanguage(data.language);
  if (languageError) {
    fieldErrors.language = languageError;
  }

  return { data, fieldErrors };
}
