import crypto from "node:crypto";

import UserMetadata from "supertokens-node/recipe/usermetadata";

// Custom OTP store for email verification (Faz 3) and OTP login (Faz 4).
//
// Why custom and not SuperTokens Passwordless: keeping EmailPassword as
// the single account type means existing password users are untouched and
// no paid Account Linking is needed. The OTP itself is small, well-scoped
// security code we own here.
//
// Storage: one top-level UserMetadata key per purpose (`authOtp_<purpose>`)
// so issuing/clearing one purpose never clobbers the other or the user's
// profile (updateUserMetadata shallow-merges top-level keys; null deletes).
// We store only an HMAC-style hash of the code (peppered + bound to the
// userId), never the code itself.

export type OtpPurpose = "email_verify" | "signin";

const CODE_LENGTH = 6;
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_THROTTLE_MS = 60 * 1000; // 60 seconds

// A `type` (not interface) so it's structurally assignable to SuperTokens'
// JSONObject when written to UserMetadata.
type OtpRecord = {
  hash: string;
  expiresAt: number;
  attempts: number;
  sentAt: number;
};

function pepper(): string {
  return process.env.AUTH_OTP_PEPPER?.trim() || "dev-auth-otp-pepper";
}

function metaKey(purpose: OtpPurpose): string {
  return `authOtp_${purpose}`;
}

// sha256(code . userId . pepper) — offline brute force of a 6-digit code
// needs the server-side pepper, which never leaves the BFF.
function hashCode(code: string, userId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${code}.${userId}.${pepper()}`)
    .digest("hex");
}

function generateCode(): string {
  return crypto.randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
}

async function readRecord(
  userId: string,
  purpose: OtpPurpose,
): Promise<OtpRecord | undefined> {
  const md = await UserMetadata.getUserMetadata(userId);
  return md.metadata?.[metaKey(purpose)] as OtpRecord | undefined;
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; throttledSeconds: number };

// Generate + store a fresh code, returning the plaintext for the caller to
// email. Throttled: a second request within RESEND_THROTTLE_MS is refused
// so the endpoint can't be used to spam someone's inbox.
export async function issueOtp(
  userId: string,
  purpose: OtpPurpose,
): Promise<IssueResult> {
  const existing = await readRecord(userId, purpose);
  const now = Date.now();
  if (existing && now - existing.sentAt < RESEND_THROTTLE_MS) {
    return {
      ok: false,
      throttledSeconds: Math.ceil(
        (RESEND_THROTTLE_MS - (now - existing.sentAt)) / 1000,
      ),
    };
  }
  const code = generateCode();
  const record: OtpRecord = {
    hash: hashCode(code, userId),
    expiresAt: now + TTL_MS,
    attempts: 0,
    sentAt: now,
  };
  await UserMetadata.updateUserMetadata(userId, { [metaKey(purpose)]: record });
  return { ok: true, code };
}

export type VerifyResult =
  | "ok"
  | "invalid"
  | "expired"
  | "too_many_attempts"
  | "no_code";

export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyResult> {
  const rec = await readRecord(userId, purpose);
  if (!rec) return "no_code";

  const now = Date.now();
  if (now > rec.expiresAt) {
    await clearOtp(userId, purpose);
    return "expired";
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await clearOtp(userId, purpose);
    return "too_many_attempts";
  }

  const candidate = hashCode(code.trim(), userId);
  const match =
    candidate.length === rec.hash.length &&
    crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(rec.hash));

  if (!match) {
    await UserMetadata.updateUserMetadata(userId, {
      [metaKey(purpose)]: { ...rec, attempts: rec.attempts + 1 },
    });
    return "invalid";
  }

  await clearOtp(userId, purpose);
  return "ok";
}

export async function clearOtp(
  userId: string,
  purpose: OtpPurpose,
): Promise<void> {
  // null deletes the top-level key, leaving profile + the other purpose.
  await UserMetadata.updateUserMetadata(userId, { [metaKey(purpose)]: null });
}
