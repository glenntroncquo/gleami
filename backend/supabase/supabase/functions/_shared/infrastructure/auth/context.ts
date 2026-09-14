import { createClient } from "supabase";
import { UnauthenticatedError } from "../errors.ts";
import { membershipIdsForUser } from "./membership.ts";

export interface AuthContext {
  userId: string;
  companyIds: string[];
  locationIds: string[];
}

function extractBearerToken(req: Request): string {
  const header = req.headers.get("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw new UnauthenticatedError("Missing Authorization header");
  }

  return token;
}

/**
 * Verifies the caller's bearer token against Supabase Auth and resolves the
 * companies they belong to from membership tables (source of truth).
 * Does not read `app_metadata.company_ids` — that claim is no longer written
 * and is not trusted here even if a stale value remains on older users.
 */
export async function getAuthContext(req: Request): Promise<AuthContext> {
  const token = extractBearerToken(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthenticatedError("Invalid or expired session");
  }

  const memberships = await membershipIdsForUser(data.user.id);

  return {
    userId: data.user.id,
    companyIds: memberships.companyIds,
    locationIds: memberships.locationIds,
  };
}

/**
 * Public manage-booking callers send the anon JWT (or no user session).
 * Those must keep working without a login. A real staff session is optional
 * and used only to apply location membership on cancel.
 */
export async function tryGetAuthContext(req: Request): Promise<AuthContext | null> {
  const header = req.headers.get("Authorization");
  if (!header?.match(/^Bearer\s+(.+)$/i)?.[1]) {
    return null;
  }

  try {
    return await getAuthContext(req);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return null;
    }
    throw err;
  }
}
