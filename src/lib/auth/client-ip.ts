// Best-effort end-user IP from proxy headers, forwarded to the email
// gateway so its per-IP rate limit can blunt someone spraying OTP
// requests across many real accounts from one source.
export function clientIpFrom(request: Request): string | undefined {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || undefined;
}
