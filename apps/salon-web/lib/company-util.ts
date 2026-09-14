import { createClient } from "@/lib/supabase/client";
import { resolveCompanyIdFromMembership } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";
import type { LocationRecord } from "@/lib/location";

/**
 * Hook to get the current company ID from company_membership
 * (AuthProvider snapshot). JWT app_metadata is not consulted.
 * When a location is selected, this follows that location's company
 * (freelancer across companies).
 */
export function useCompanyId(): string | null {
  const { companyId } = useAuth();
  return companyId;
}

/**
 * Current location for the signed-in user. Day-to-day queries should
 * filter by this id. Persisted across sessions in localStorage.
 */
export function useLocationId(): string | null {
  const { locationId } = useAuth();
  return locationId;
}

export function useCurrentLocation(): LocationRecord | null {
  const { currentLocation } = useAuth();
  return currentLocation;
}

/**
 * Resolve the company ID from memberships / permission RPCs.
 * Server-side and non-hook callers only. Prefer useCompanyId() in React.
 */
export async function getCompanyId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const result = await resolveCompanyIdFromMembership(supabase);

    if ("error" in result) {
      console.warn(result.error);
      return null;
    }

    return result.companyId;
  } catch (error) {
    console.error("Error resolving company ID from membership:", error);
    return null;
  }
}
