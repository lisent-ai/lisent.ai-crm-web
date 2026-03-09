export const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export type GenderValue = (typeof genderOptions)[number]["value"];

export type SignUpProfileFields = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: GenderValue | "";
};

export const emptySignUpProfileFields: SignUpProfileFields = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  gender: "",
};

function validateRequiredText(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return `${label} is required.`;
  }

  if (value.trim().length < 2) {
    return `${label} must be at least 2 characters.`;
  }

  return undefined;
}

export function validateFirstName(value: unknown) {
  return validateRequiredText(value, "Name");
}

export function validateLastName(value: unknown) {
  return validateRequiredText(value, "Surname");
}

export function validatePhoneNumber(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return "Phone number is required.";
  }

  const normalized = value.replace(/[^\d+]/g, "");
  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return "Enter a valid phone number.";
  }

  return undefined;
}

export function validateGender(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return "Gender is required.";
  }

  if (!genderOptions.some((option) => option.value === value)) {
    return "Select a valid gender option.";
  }

  return undefined;
}
