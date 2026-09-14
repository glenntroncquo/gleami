import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import {
  toServiceListItem,
  toServiceStaffEligibility,
  toServiceSummary,
  toServiceVariantWithPhases,
  toVariantStaffEligibility,
  type ServiceStaffEligibilityRow,
  type ServiceWithVariantsRow,
  type VariantStaffEligibilityRow,
  type VariantWithPhasesRow,
} from "./mapper.ts";
import type {
  ServiceListItem,
  ServiceStaffEligibility,
  ServiceSummary,
  ServiceVariantWithPhases,
  VariantStaffEligibility,
} from "./entity.ts";

export interface FindActiveServicesParams {
  companyId: string;
  serviceIds?: string[];
}

export const serviceRepository = {
  async findServiceIdsForStaffIds(
    companyId: string,
    staffIds: string[],
    locationId?: string | null,
  ): Promise<string[]> {
    let query = supabaseAdmin
      .from("staff_service")
      .select("service_id")
      .eq("company_id", companyId)
      .in("staff_id", staffIds);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError("Failed to fetch service ids for staff", { cause: error });
    }

    return [...new Set((data ?? []).map((row) => row.service_id))];
  },

  async findActiveWithVariants(params: FindActiveServicesParams): Promise<ServiceListItem[]> {
    let query = supabaseAdmin
      .from("service")
      .select(
        `
        id,
        name,
        description,
        company_id,
        display_order,
        booking_interval_minutes,
        service_variant (
          id,
          name,
          price,
          price_net,
          max_price,
          client_duration_minutes,
          staff_duration_minutes,
          image_path,
          display_order,
          is_active,
          is_deleted,
          service_variant_phase (
            sequence,
            phase_type,
            duration_minutes,
            label
          )
        )
      `,
      )
      .eq("company_id", params.companyId)
      .eq("is_active", true)
      .eq("is_deleted", false);

    if (params.serviceIds) {
      query = query.in("id", params.serviceIds);
    }

    const { data, error } = await query.order("display_order");

    if (error) {
      throw new RepositoryError("Failed to fetch services with variants", { cause: error });
    }

    return ((data ?? []) as unknown as ServiceWithVariantsRow[]).map(toServiceListItem);
  },

  async findServicesByIds(serviceIds: string[]): Promise<ServiceSummary[]> {
    if (serviceIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("service")
      .select("id, booking_interval_minutes")
      .in("id", serviceIds);

    if (error) {
      throw new RepositoryError("Failed to fetch services by id", { cause: error });
    }

    return (data ?? []).map(toServiceSummary);
  },

  async findVariantsWithPhasesByIds(variantIds: string[]): Promise<ServiceVariantWithPhases[]> {
    if (variantIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("service_variant")
      .select(
        `
        id,
        service_id,
        client_duration_minutes,
        staff_duration_minutes,
        service_variant_phase (
          sequence,
          phase_type,
          duration_minutes,
          label
        )
      `,
      )
      .in("id", variantIds)
      .eq("is_deleted", false);

    if (error) {
      throw new RepositoryError("Failed to fetch service variants", { cause: error });
    }

    return ((data ?? []) as unknown as VariantWithPhasesRow[]).map(toServiceVariantWithPhases);
  },

  async findEligibleStaffForServices(
    serviceIds: string[],
    locationId?: string | null,
  ): Promise<ServiceStaffEligibility[]> {
    if (serviceIds.length === 0) return [];

    let query = supabaseAdmin
      .from("staff_service")
      .select(
        `
        staff_id,
        service_id,
        staff:staff_id (
          first_name,
          last_name,
          image_path
        )
      `,
      )
      .in("service_id", serviceIds);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError("Failed to fetch eligible staff for services", { cause: error });
    }

    return ((data ?? []) as unknown as ServiceStaffEligibilityRow[])
      .map(toServiceStaffEligibility)
      .filter((row): row is ServiceStaffEligibility => row !== null);
  },

  async findEligibleStaffForVariants(
    variantIds: string[],
    locationId?: string | null,
  ): Promise<VariantStaffEligibility[]> {
    if (variantIds.length === 0) return [];

    let query = supabaseAdmin
      .from("staff_service_variant")
      .select(
        `
        staff_id,
        service_variant_id,
        staff:staff_id (
          first_name,
          last_name,
          image_path
        )
      `,
      )
      .in("service_variant_id", variantIds);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError("Failed to fetch eligible staff for service variants", { cause: error });
    }

    return ((data ?? []) as unknown as VariantStaffEligibilityRow[])
      .map(toVariantStaffEligibility)
      .filter((row): row is VariantStaffEligibility => row !== null);
  },
};
