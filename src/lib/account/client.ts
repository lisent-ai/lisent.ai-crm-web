import type {
  AccountProfile,
  AccountProfileFieldErrors,
} from "@/lib/auth/account-profile";
import type { SignUpProfileFields } from "@/lib/auth/sign-up-fields";

type AccountErrorPayload = {
  error?: string;
  fieldErrors?: AccountProfileFieldErrors;
};

export class AccountClientError extends Error {
  status: number;
  fieldErrors: AccountProfileFieldErrors;

  constructor(
    message: string,
    status: number,
    fieldErrors: AccountProfileFieldErrors = {},
  ) {
    super(message);
    this.name = "AccountClientError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export const ACCOUNT_PROFILE_UPDATED_EVENT = "account-profile-updated";

function emitAccountProfileUpdated(profile: AccountProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AccountProfile>(ACCOUNT_PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  );
}

async function requestAccount<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/account", {
    cache: "no-store",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json().catch(() => null)) as T | AccountErrorPayload | null;

  if (!response.ok) {
    const errorPayload =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as AccountErrorPayload)
        : null;

    throw new AccountClientError(
      errorPayload?.error ?? "Account request failed.",
      response.status,
      errorPayload?.fieldErrors ?? {},
    );
  }

  return data as T;
}

export function getAccountProfile() {
  return requestAccount<AccountProfile>({ method: "GET" });
}

export function updateAccountProfile(profile: SignUpProfileFields) {
  return requestAccount<AccountProfile>({
    method: "PATCH",
    body: JSON.stringify(profile),
  }).then((response) => {
    emitAccountProfileUpdated(response);
    return response;
  });
}
