/**
 * Pure membership-set assembly. Matches `public.my_locations` /
 * `private.location_ids_for_user` semantics:
 *   - company_membership → that company + every location of that company
 *   - active location_membership → that location + its company
 *
 * Kept free of supabase so unit tests can cover the set logic without Deno.
 */
export function assembleMembershipIds(input: {
  companyMembershipCompanyIds: string[];
  locationMembershipLocationIds: string[];
  locationRows: Array<{ id: string; companyId: string }>;
}): { companyIds: string[]; locationIds: string[] } {
  const companyIds = new Set(input.companyMembershipCompanyIds);
  const locationIds = new Set(input.locationMembershipLocationIds);

  for (const row of input.locationRows) {
    companyIds.add(row.companyId);
    locationIds.add(row.id);
  }

  return {
    companyIds: [...companyIds],
    locationIds: [...locationIds],
  };
}
