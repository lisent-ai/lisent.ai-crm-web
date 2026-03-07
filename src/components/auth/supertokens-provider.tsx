"use client";

import { useMemo } from "react";
import { SuperTokensWrapper } from "supertokens-auth-react";

import { ensureFrontendSuperTokensInit } from "@/lib/supertokens/frontend";

export function SuperTokensProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useMemo(() => {
    ensureFrontendSuperTokensInit();
  }, []);

  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
}
