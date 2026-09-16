import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";

export interface PublicBookingLocation {
  id: string;
  companyId: string;
  timezone: string;
  isActive: boolean;
}

export const locationRepository = {
  async findByIdForCompany(
    companyId: string,
    locationId: string,
  ): Promise<PublicBookingLocation | null> {
    const { data, error } = await supabaseAdmin
      .from("location")
      .select("id, company_id, timezone, is_active")
      .eq("id", locationId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch location", { cause: error });
    }

    if (!data) return null;

    return {
      id: data.id,
      companyId: data.company_id,
      timezone: data.timezone,
      isActive: data.is_active,
    };
  },

  async findPrimary(companyId: string): Promise<PublicBookingLocation | null> {
    const { data, error } = await supabaseAdmin
      .from("location")
      .select("id, company_id, timezone, is_active")
      .eq("company_id", companyId)
      .eq("is_primary", true)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch primary location", { cause: error });
    }

    if (!data) return null;

    return {
      id: data.id,
      companyId: data.company_id,
      timezone: data.timezone,
      isActive: data.is_active,
    };
  },

  async findServiceIdsForLocation(locationId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("location_service")
      .select("service_id")
      .eq("location_id", locationId);

    if (error) {
      throw new RepositoryError("Failed to fetch location services", { cause: error });
    }

    return [...new Set((data ?? []).map((row) => row.service_id))];
  },

  async findStaffIdsForLocation(locationId: string): Promise<string[]> {
    const [offers, memberships] = await Promise.all([
      supabaseAdmin
        .from("staff_service")
        .select("staff_id")
        .eq("location_id", locationId),
      supabaseAdmin
        .from("location_membership")
        .select("staff_id")
        .eq("location_id", locationId)
        .eq("is_active", true)
        .not("staff_id", "is", null),
    ]);

    if (offers.error) {
      throw new RepositoryError("Failed to fetch staff offers for location", {
        cause: offers.error,
      });
    }
    if (memberships.error) {
      throw new RepositoryError("Failed to fetch location memberships", {
        cause: memberships.error,
      });
    }

    const ids = new Set<string>();
    for (const row of offers.data ?? []) {
      ids.add(row.staff_id);
    }
    for (const row of memberships.data ?? []) {
      if (row.staff_id) ids.add(row.staff_id);
    }
    return [...ids];
  },
};
