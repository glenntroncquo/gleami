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

    const { data, error } = await customerAdmin()
      .rpc("marketplace_auth_email_status", { p_email: normalizeEmail(validated.email) })
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
