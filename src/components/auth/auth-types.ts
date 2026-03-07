export type AuthMode = "signin" | "signup";

export function resolveMode(pathname: string): AuthMode {
  return pathname.includes("sign-up") ? "signup" : "signin";
}

export function mapFieldErrors(
  fields: Array<{ id: string; error: string }>,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.id] = field.error;
    return acc;
  }, {});
}
