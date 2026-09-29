/**
 * Allowlist for caller-supplied redirect URLs (H4/M4). These URLs end up in
 * emails (auth confirmation) or Stripe Checkout sessions, where an arbitrary
 * URL turns our transactional mail into a phishing vector.
 */
export function isAllowedRedirectUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (url.protocol !== "https:" && !isLocal) return false;
  return isLocal || host === "salonify.co" || host.endsWith(".salonify.co");
}
