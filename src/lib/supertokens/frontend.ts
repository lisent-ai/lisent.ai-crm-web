"use client";

import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import Session from "supertokens-auth-react/recipe/session";

import { appInfo } from "@/config/app-info";

let frontendInitDone = false;

export function ensureFrontendSuperTokensInit() {
  if (frontendInitDone || typeof window === "undefined") {
    return;
  }

  SuperTokens.init({
    appInfo,
    recipeList: [EmailPassword.init(), Session.init()],
  });

  frontendInitDone = true;
}
