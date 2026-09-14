import { supabaseAdmin } from "../supabase/client.ts";
import { RepositoryError } from "../errors.ts";
import { assembleMembershipIds } from "./membership-ids.ts";

/**
 * Membership equivalent of the retired JWT `app_metadata.company_ids` claim
 * plus the location set used by `public.my_locations`.
 *
 * Uses service_role so this does not depend on RLS or on `auth.uid()` inside
 * an edge isolate (the private helper reads the caller's JWT, which the
 * admin client does not present).
 */
export async function membershipIdsForUser(userId: string): Promise<{
  companyIds: string[];
  locationIds: string[];
}> {
  const [companyResult, locationMembershipResult] = await Promise.all([
    supabaseAdmin
      .from("company_membership")
      .select("company_id")
      .eq("user_id", userId),
    supabaseAdmin
      .from("location_membership")
      .select("location_id")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  if (companyResult.error) {
    throw new RepositoryError("Failed to load company memberships", {
      cause: companyResult.error,
    });
  }
  if (locationMembershipResult.error) {
    throw new RepositoryError("Failed to load location memberships", {
      cause: locationMembershipResult.error,
    });
  }

  const companyMembershipCompanyIds = (companyResult.data ?? []).map(
    (row) => row.company_id,
  );
  const locationMembershipLocationIds = (locationMembershipResult.data ?? []).map(
    (row) => row.location_id,
  );

  const locationRows: Array<{ id: string; companyId: string }> = [];
  const locationLookups = [];

  if (locationMembershipLocationIds.length > 0) {
    locationLookups.push(
      supabaseAdmin
        .from("location")
        .select("id, company_id")
        .in("id", locationMembershipLocationIds),
    );
  }

  if (companyMembershipCompanyIds.length > 0) {
    locationLookups.push(
      supabaseAdmin
        .from("location")
        .select("id, company_id")
        .in("company_id", companyMembershipCompanyIds),
    );
  }

  if (locationLookups.length > 0) {
    const results = await Promise.all(locationLookups);
    for (const result of results) {
      if (result.error) {
        throw new RepositoryError("Failed to resolve membership locations", {
          cause: result.error,
        });
      }
      for (const row of result.data ?? []) {
        locationRows.push({ id: row.id, companyId: row.company_id });
      }
    }
  }

  return assembleMembershipIds({
    companyMembershipCompanyIds,
    locationMembershipLocationIds,
    locationRows,
  });
}

export async function companyIdsForUser(userId: string): Promise<string[]> {
  return (await membershipIdsForUser(userId)).companyIds;
}
