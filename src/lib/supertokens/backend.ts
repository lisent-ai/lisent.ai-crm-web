import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";
import UserMetadata from "supertokens-node/recipe/usermetadata";

import { resolveAppInfoForBackend } from "@/config/app-info";
import {
  validateFirstName,
  validateGender,
  validateLastName,
  validatePhoneNumber,
} from "@/lib/auth/sign-up-fields";

function normaliseSuperTokensConnectionURI(raw: string): string {
  const trimmed = raw.trim();
  // Trailing slash can make Core respond with 301; the Node SDK uses redirect:manual and treats that as fatal.
  return trimmed.replace(/\/+$/, "");
}

function getSuperTokensConnectionURI(): string {
  const fromEnv = process.env.SUPERTOKENS_CONNECTION_URI?.trim();
  return normaliseSuperTokensConnectionURI(
    fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:3567",
  );
}

let backendInitDone = false;

/** Pass the incoming `Request` on first use so `appInfo` matches the public URL behind a proxy. */
export function ensureBackendSuperTokensInit(request?: Request) {
  if (backendInitDone) {
    return;
  }

  SuperTokens.init({
    debug: process.env.SUPERTOKENS_DEBUG === "true",
    appInfo: resolveAppInfoForBackend(request),
    supertokens: {
      connectionURI: getSuperTokensConnectionURI(),
      apiKey: process.env.SUPERTOKENS_API_KEY,
    },
    recipeList: [
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            {
              id: "first_name",
              validate: async (value) => validateFirstName(value),
            },
            {
              id: "last_name",
              validate: async (value) => validateLastName(value),
            },
            {
              id: "phone_number",
              validate: async (value) => validatePhoneNumber(value),
            },
            {
              id: "gender",
              validate: async (value) => validateGender(value),
            },
          ],
        },
        override: {
          apis: (originalImplementation) => ({
            ...originalImplementation,
            signUpPOST: async (input) => {
              if (originalImplementation.signUpPOST === undefined) {
                throw new Error("signUpPOST is not available");
              }

              const response = await originalImplementation.signUpPOST(input);
              if (response.status !== "OK") {
                return response;
              }

              const fieldValue = (id: string) =>
                String(input.formFields.find((field) => field.id === id)?.value ?? "").trim();

              await UserMetadata.updateUserMetadata(response.user.id, {
                profile: {
                  firstName: fieldValue("first_name"),
                  lastName: fieldValue("last_name"),
                  phoneNumber: fieldValue("phone_number"),
                  gender: fieldValue("gender"),
                },
              });

              return response;
            },
          }),
        },
      }),
      Session.init({
        // Force cookie-based session transfer. Next.js 16 App Router clients
        // do not reliably send the "st-auth-mode" hint, so the SDK was
        // silently falling back to header-mode on sign-in — tokens returned
        // only as response headers, no Set-Cookie emitted, browser never
        // had a session, /api/crm/* replied 401 on every call. Pinning the
        // transfer method avoids that drift and matches the browser's
        // cookie-only expectations (supertokens-web-js default).
        getTokenTransferMethod: () => "cookie",
      }),
      UserMetadata.init(),
    ],
  });

  backendInitDone = true;
}
