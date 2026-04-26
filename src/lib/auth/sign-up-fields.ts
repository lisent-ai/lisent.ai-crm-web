import {
  isSupportedLocale,
  type SupportedLocale,
} from "@/lib/i18n/config";

export type ValidationKey =
  | "validation.firstNameRequired"
  | "validation.firstNameTooShort"
  | "validation.lastNameRequired"
  | "validation.lastNameTooShort"
  | "validation.phoneRequired"
  | "validation.phoneInvalid"
  | "validation.genderRequired"
  | "validation.genderInvalid"
  | "validation.languageInvalid";

export type ValidationError = { key: ValidationKey };

export const genderOptions = [
  { value: "male", labelKey: "account.gender.male" },
  { value: "female", labelKey: "account.gender.female" },
] as const;

export type GenderValue = (typeof genderOptions)[number]["value"];

export type SignUpProfileFields = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: GenderValue | "";
  language: SupportedLocale | "";
};

export const emptySignUpProfileFields: SignUpProfileFields = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  gender: "",
  language: "",
};

function validateRequiredText(
  value: unknown,
  requiredKey: ValidationKey,
  tooShortKey: ValidationKey,
): ValidationError | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return { key: requiredKey };
  }
  if (value.trim().length < 2) {
    return { key: tooShortKey };
  }
  return undefined;
}

export function validateFirstName(value: unknown): ValidationError | undefined {
  return validateRequiredText(
    value,
    "validation.firstNameRequired",
    "validation.firstNameTooShort",
  );
}

export function validateLastName(value: unknown): ValidationError | undefined {
  return validateRequiredText(
    value,
    "validation.lastNameRequired",
    "validation.lastNameTooShort",
  );
}

export function validatePhoneNumber(
  value: unknown,
): ValidationError | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return { key: "validation.phoneRequired" };
  }
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { key: "validation.phoneInvalid" };
  }
  return undefined;
}

export function validateGender(value: unknown): ValidationError | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return { key: "validation.genderRequired" };
  }
  if (!genderOptions.some((option) => option.value === value)) {
    return { key: "validation.genderInvalid" };
  }
  return undefined;
}

export function validateLanguage(value: unknown): ValidationError | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return { key: "validation.languageInvalid" };
  }
  if (!isSupportedLocale(value)) {
    return { key: "validation.languageInvalid" };
  }
  return undefined;
}
