import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { customerAdmin, normalizeEmail } from "../_shared/marketplace/customer.ts";
import { marketplaceAuthLookupSchema } from "./schema.ts";

/**
 * Tells the marketplace app which step follows the email screen:
 * an existing account with a password goes to the password screen, anything
 * else (new email, passwordless, Apple/Google-only) gets an email code.
 * Returns no user data beyond these two booleans.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  try {
    const validated = validateInput(marketplaceAuthLookupSchema, await req.json());
    if (validated instanceof BadResponse) return validated;

    // M6: the exists/hasPassword answer is an account-enumeration oracle, so
    // throttle it: per source IP and per target email. The limiter runs as
    // the service role; the RPC is not callable by anon/authenticated.
    const admin = customerAdmin();
    const email = normalizeEmail(validated.email);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const keys = [
      { p_key: `auth-lookup:ip:${ip}`, p_limit: 20, p_window_seconds: 3600 },
      { p_key: `auth-lookup:email:${email}`, p_limit: 5, p_window_seconds: 3600 },
    ];
    for (const key of keys) {
      const { data: allowed, error: limitError } = await admin.rpc("check_rate_limit", key);
      if (limitError) {
        console.error("rate limit check failed", limitError);
        return new BadResponse("Lookup failed", 500);
      }
      if (allowed === false) {
        return new BadResponse("Too many attempts, try again later", 429);
      }
    }

    const { data, error } = await admin
      .rpc("marketplace_auth_email_status", { p_email: email })
      .single<{ account_exists: boolean; has_password: boolean }>();
    if (error) throw error;

    return new OkResponse({
      exists: Boolean(data?.account_exists),
      hasPassword: Boolean(data?.has_password),
    });
  } catch (err) {
    console.error(err);
    return new BadResponse("Lookup failed", 500);
  }
});
