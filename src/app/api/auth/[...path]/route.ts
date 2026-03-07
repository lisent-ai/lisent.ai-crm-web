import { getAppDirRequestHandler } from "supertokens-node/nextjs";

import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";

ensureBackendSuperTokensInit();

const handleCall = getAppDirRequestHandler();

export async function GET(request: Request) {
  return handleCall(request);
}

export async function POST(request: Request) {
  return handleCall(request);
}

export async function PUT(request: Request) {
  return handleCall(request);
}

export async function PATCH(request: Request) {
  return handleCall(request);
}

export async function DELETE(request: Request) {
  return handleCall(request);
}

export async function OPTIONS(request: Request) {
  return handleCall(request);
}
