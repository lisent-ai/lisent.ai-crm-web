import { getAppDirRequestHandler } from "supertokens-node/nextjs";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

const handleCall = getAppDirRequestHandler();

export async function GET(request: Request) {
  ensureBackendSuperTokensInit(request);
  return handleCall(request);
}

export async function POST(request: Request) {
  ensureBackendSuperTokensInit(request);
  return handleCall(request);
}

export async function PUT(request: Request) {
  ensureBackendSuperTokensInit(request);
  return handleCall(request);
}

export async function PATCH(request: Request) {
  ensureBackendSuperTokensInit(request);
  return handleCall(request);
}

export async function DELETE(request: Request) {
  ensureBackendSuperTokensInit(request);
  return handleCall(request);
}

export async function OPTIONS(request: Request) {
  ensureBackendSuperTokensInit(request);
  return handleCall(request);
}
