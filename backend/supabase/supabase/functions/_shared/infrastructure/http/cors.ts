/**
 * CORS policy (H6).
 *
 * This API authenticates with explicit bearer tokens / shared secrets, never
 * cookies, so a wildcard ACAO does not expose ambient browser credentials.
 * Even so, the wildcard is being phased out:
 *
 * - Staff/internal functions call `rejectDisallowedOrigin(req)` first and
 *   refuse browser requests from non-first-party origins outright.
 * - Public widget/marketplace endpoints (appointment-*, availability-list,
 *   service-list, staff-list, company-search/get, marketplace-*) stay open:
 *   they serve the iframe-embeddable booking widget and public marketplace,
 *   which is a deliberately public, header-authenticated surface.
 *
 * ALLOWED_ORIGINS (comma-separated env) overrides the first-party default.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://salonify.co",
  "https://www.salonify.co",
  "https://app.salonify.co",
  "https://booking.salonify.co",
];

function envAllowedOrigins(): string[] {
  // `typeof` guard: unit tests run under Node (no Deno global).
  const raw = typeof Deno !== "undefined" ? Deno.env.get("ALLOWED_ORIGINS") : undefined;
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): boolean {
  // Non-browser callers (cron, pg_net triggers, Stripe, server-to-server)
  // send no Origin header; CORS does not apply to them.
  if (!origin) return true;

  const configured = envAllowedOrigins();
  if (configured.length > 0) return configured.includes(origin);

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    return url.protocol === "https:" && (host === "salonify.co" || host.endsWith(".salonify.co"));
  } catch {
    return false;
  }
}

export function corsHeadersFor(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin)
      ? origin
      : DEFAULT_ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/**
 * Gate for staff/internal functions: reject browser requests from disallowed
 * origins before any processing. Non-browser callers pass through.
 */
export function rejectDisallowedOrigin(req: Request): Response | null {
  const origin = req.headers.get("Origin");
  if (isAllowedOrigin(origin)) return null;
  return new Response(JSON.stringify({ success: false, error: "Origin not allowed" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Back-compat constant for the public widget/marketplace surface (see the
 * header comment). Prefer corsHeadersFor / rejectDisallowedOrigin in new code.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
