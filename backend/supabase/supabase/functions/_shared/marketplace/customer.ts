import { createClient, type SupabaseClient, type User } from "supabase";
import { UnauthenticatedError } from "../infrastructure/errors.ts";

let admin: SupabaseClient | null = null;

/** Untyped service-role client: the account RPCs are newer than the generated Database types. */
export function customerAdmin(): SupabaseClient {
  admin ??= createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return admin;
}

/**
 * Resolves the marketplace customer behind a user JWT. Unlike getAuthContext
 * this returns the full auth user (email, confirmation, identities) and does
 * not load salon memberships.
 */
export async function getCustomerUser(req: Request): Promise<User> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new UnauthenticatedError("Missing Authorization header");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new UnauthenticatedError("Invalid or expired session");
  return data.user;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
