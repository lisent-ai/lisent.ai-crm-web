import {
  emptySignUpProfileFields,
  type SignUpProfileFields,
  validateFirstName,
  validateGender,
  validateLastName,
  validatePhoneNumber,
} from "@/lib/auth/sign-up-fields";

export type AccountProfile = SignUpProfileFields & {
  userId: string;
  email: string;
  displayName: string;
};

export type AccountProfileFieldErrors = Partial<
  Record<keyof SignUpProfileFields, string>
>;

export function normalizeAccountProfile(raw: unknown): SignUpProfileFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptySignUpProfileFields;
  }

  const profile = raw as Partial<Record<keyof SignUpProfileFields, unknown>>;

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

  return { data, fieldErrors };
}
