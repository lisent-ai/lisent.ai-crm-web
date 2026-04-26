"use client";

import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import Session from "supertokens-auth-react/recipe/session";

import { appInfoBase } from "@/config/app-info";
import {
  validateFirstName,
  validateGender,
  validateLastName,
  validatePhoneNumber,
} from "@/lib/auth/sign-up-fields";

let frontendInitDone = false;

export function ensureFrontendSuperTokensInit() {
  if (frontendInitDone || typeof window === "undefined") {
    return;
  }

  const origin = window.location.origin;
  SuperTokens.init({
    appInfo: {
      ...appInfoBase,
      apiDomain: origin,
      websiteDomain: origin,
    },
    recipeList: [
      EmailPassword.init({
        signInAndUpFeature: {
          signUpForm: {
            formFields: [
              {
                id: "first_name",
                label: "Name",
                placeholder: "Your first name",
                validate: async (value) => validateFirstName(value)?.key,
              },
              {
                id: "last_name",
                label: "Surname",
                placeholder: "Your surname",
                validate: async (value) => validateLastName(value)?.key,
              },
              {
                id: "phone_number",
                label: "Phone number",
                placeholder: "+49 555 123 4567",
                validate: async (value) => validatePhoneNumber(value)?.key,
              },
              {
                id: "gender",
                label: "Gender",
                placeholder: "Select your gender",
                validate: async (value) => validateGender(value)?.key,
              },
            ],
          },
        },
      }),
      Session.init(),
    ],
  });

  frontendInitDone = true;
}
