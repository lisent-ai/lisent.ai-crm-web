// Telnyx WhatsApp Business API helper — sends a pre-approved template message.
// Used to notify a sales rep on WhatsApp when a lead is assigned to them.
// Telnyx is the WhatsApp BSP; the company's Telnyx number is the sender.

type SendLeadAssignedInput = {
  to: string; // E.164 recipient (rep phone)
  languageCode: string; // approved WhatsApp template language code (e.g. "en", "ru")
  campaign: string; // {{1}}
  leadName: string; // {{2}}
};

export type TelnyxSendResult = { ok: boolean; status: number; error?: string };

export async function sendLeadAssignedWhatsApp(
  input: SendLeadAssignedInput,
): Promise<TelnyxSendResult> {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  const from = process.env.TELNYX_WHATSAPP_FROM?.trim();
  const template = process.env.TELNYX_WA_TEMPLATE?.trim() || "lead_assigned";
  if (!apiKey || !from) {
    return { ok: false, status: 0, error: "telnyx not configured" };
  }

  const res = await fetch("https://api.telnyx.com/v2/messages/whatsapp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      whatsapp_message: {
        type: "template",
        template: {
          name: template,
          language: { policy: "deterministic", code: input.languageCode },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: input.campaign },
                { type: "text", text: input.leadName },
              ],
            },
          ],
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: text.slice(0, 500) };
  }
  return { ok: true, status: res.status };
}

// Pick the approved WhatsApp template language for a rep. TELNYX_WA_LANGS holds
// the EXACT approved Telnyx language codes (e.g. "en,ru" or "en_US,ru"); the
// rep's app language (SuperTokens profile.language) is matched against it, with
// a base-prefix fallback (rep "en" -> approved "en_US") and a final fallback.
export function resolveTemplateLanguage(repLanguage: string | undefined): string {
  const available = (process.env.TELNYX_WA_LANGS || "en,ru")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fallback = (process.env.TELNYX_WA_FALLBACK_LANG || available[0] || "en").trim();
  const lang = (repLanguage || "").trim().toLowerCase();
  if (!lang) return fallback;
  const exact = available.find((c) => c.toLowerCase() === lang);
  if (exact) return exact;
  const base = lang.split(/[-_]/)[0];
  const prefix = available.find((c) => c.toLowerCase().split(/[-_]/)[0] === base);
  return prefix ?? fallback;
}

// Best-effort E.164 normalisation. Reps ideally store numbers with a country
// code (+90..., +7...); for bare local numbers we assume Turkey (+90).
export function toE164(raw: string, defaultCc = "90"): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) {
    const d = s.slice(1).replace(/\D/g, "");
    return d ? `+${d}` : "";
  }
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+${defaultCc}${digits.slice(1)}`;
  if (digits.length >= 11) return `+${digits}`;
  return `+${defaultCc}${digits}`;
}
