import { NextRequest } from "next/server";

import { loadAccountIdentity } from "@/lib/auth/account-server";
import { ensureBackendSuperTokensInit } from "@/lib/supertokens/backend";
import {
  resolveTemplateLanguage,
  sendLeadAssignedWhatsApp,
  toE164,
} from "@/lib/telnyx/whatsapp";

export const dynamic = "force-dynamic";

// Internal (machine-to-machine) endpoint: the Go CRM service POSTs here when a
// lead becomes assigned to a rep. We resolve the rep's phone + language from
// SuperTokens and send a WhatsApp template via Telnyx. Always returns 200-ish
// to the caller (fire-and-forget); failures are logged, never retried-stormed.
export async function POST(request: NextRequest) {
  // Fail closed: without a configured shared secret the endpoint is inert, so
  // it can never become an open relay that bills Telnyx / spams reps.
  const secret = process.env.LEAD_ASSIGN_NOTIFY_SECRET?.trim();
  if (!secret) {
    return Response.json({ ok: true, skipped: "not configured" });
  }
  const provided = request.headers.get("x-internal-secret")?.trim() ?? "";
  if (provided !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if ((process.env.LEAD_ASSIGN_WHATSAPP_ENABLED ?? "").trim() === "false") {
    return Response.json({ ok: true, skipped: "disabled" });
  }

  const body = (await request.json().catch(() => null)) as {
    assignee_user_id?: string;
    lead_name?: string;
    campaign_label?: string;
  } | null;

  const assigneeUserId = (body?.assignee_user_id ?? "").trim();
  if (!assigneeUserId) {
    return Response.json({ ok: true, skipped: "no assignee" });
  }
  const leadName = (body?.lead_name ?? "").trim() || "—";
  const campaign = (body?.campaign_label ?? "").trim() || "—";

  ensureBackendSuperTokensInit(request);

  let phone = "";
  let language: string | undefined;
  try {
    const identity = await loadAccountIdentity(assigneeUserId);
    phone = toE164((identity?.phoneNumber ?? "").trim());
    language = identity?.language;
  } catch (error) {
    console.error("lead-assigned: identity lookup failed", error);
    return Response.json({ ok: true, skipped: "identity error" });
  }
  if (!phone) {
    return Response.json({ ok: true, skipped: "no phone" });
  }

  const result = await sendLeadAssignedWhatsApp({
    to: phone,
    languageCode: resolveTemplateLanguage(language),
    campaign,
    leadName,
  });
  if (!result.ok) {
    console.error("lead-assigned: telnyx send failed", result.status, result.error);
    return Response.json({ ok: false, status: result.status });
  }
  return Response.json({ ok: true });
}
