import SuperTokens from "supertokens-node";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Session from "supertokens-node/recipe/session";

import { appInfo } from "@/config/app-info";

let backendInitDone = false;

export function ensureBackendSuperTokensInit() {
  if (backendInitDone) {
    return;
  }

  SuperTokens.init({
    appInfo,
    supertokens: {
      connectionURI:
        process.env.SUPERTOKENS_CONNECTION_URI ?? "http://localhost:3567",
      apiKey: process.env.SUPERTOKENS_API_KEY,
    },
    recipeList: [EmailPassword.init(), Session.init()],
  });

  backendInitDone = true;
}
