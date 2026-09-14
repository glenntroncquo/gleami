import type {
  ServiceListItem,
  ServicePhase,
  ServiceStaffEligibility,
  ServiceSummary,
  ServiceVariantWithPhases,
  VariantStaffEligibility,
} from "./entity.ts";

export interface ServicePhaseRow {
  sequence: number;
  phase_type: "busy" | "free" | "buffer";
  duration_minutes: number;
  label: string | null;
}

export interface ServiceVariantRow {
  id: string;
  name: string;
  price: number;
  price_net: number | null;
  max_price: number | null;
  client_duration_minutes: number;
  staff_duration_minutes: number | null;
  image_path: string | null;
  display_order: number | null;
  is_active: boolean | null;
  is_deleted: boolean | null;
  service_variant_phase: ServicePhaseRow[] | null;
}

export interface ServiceWithVariantsRow {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  display_order: number | null;
  booking_interval_minutes: number | null;
  service_variant: ServiceVariantRow[] | null;
}

export function toServicePhase(row: ServicePhaseRow): ServicePhase {
  return {
    sequence: row.sequence,
    phaseType: row.phase_type,
    durationMinutes: Number(row.duration_minutes),
    label: row.label,
  };
}

export function toServiceListItem(row: ServiceWithVariantsRow): ServiceListItem {
  const variants = (row.service_variant ?? [])
    .filter((variant) => variant.is_active !== false && variant.is_deleted !== true)
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: Number(variant.price),
      priceNet: variant.price_net,
      maxPrice: variant.max_price,
      clientDurationMinutes: Number(variant.client_duration_minutes),
      staffDurationMinutes: variant.staff_duration_minutes == null ? null : Number(variant.staff_duration_minutes),
      imagePath: variant.image_path,
      displayOrder: variant.display_order,
      phases: (variant.service_variant_phase ?? [])
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map(toServicePhase),
    }));

  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    displayOrder: row.display_order,
    bookingIntervalMinutes: row.booking_interval_minutes == null ? null : Number(row.booking_interval_minutes),
    variants,
  };
}

export interface StaffInfoRow {
  first_name: string | null;
  last_name: string | null;
  image_path: string | null;
}

export interface ServiceStaffEligibilityRow {
  staff_id: string;
  service_id: string;
  staff: StaffInfoRow | null;
}

export function toServiceStaffEligibility(
  row: ServiceStaffEligibilityRow,
): ServiceStaffEligibility | null {
  if (!row.staff) return null;
  return {
    staffId: row.staff_id,
    serviceId: row.service_id,
    staffInfo: {
      firstName: row.staff.first_name,
      lastName: row.staff.last_name,
      imagePath: row.staff.image_path,
    },
  };
}

export interface VariantStaffEligibilityRow {
  staff_id: string;
  service_variant_id: string;
  staff: StaffInfoRow | null;
}

export function toVariantStaffEligibility(
  row: VariantStaffEligibilityRow,
): VariantStaffEligibility | null {
  if (!row.staff) return null;
  return {
    staffId: row.staff_id,
    serviceVariantId: row.service_variant_id,
    staffInfo: {
      firstName: row.staff.first_name,
      lastName: row.staff.last_name,
      imagePath: row.staff.image_path,
    },
  };
}

export interface ServiceSummaryRow {
  id: string;
  booking_interval_minutes: number | null;
}

export function toServiceSummary(row: ServiceSummaryRow): ServiceSummary {
  return {
    id: row.id,
    bookingIntervalMinutes: Number(row.booking_interval_minutes ?? 60),
  };
}

export interface VariantWithPhasesRow {
  id: string;
  service_id: string;
  client_duration_minutes: number;
  staff_duration_minutes: number | null;
  service_variant_phase: ServicePhaseRow[] | null;
}

export function toServiceVariantWithPhases(row: VariantWithPhasesRow): ServiceVariantWithPhases {
  return {
    id: row.id,
    serviceId: row.service_id,
    clientDurationMinutes: Number(row.client_duration_minutes),
    staffDurationMinutes: row.staff_duration_minutes == null ? null : Number(row.staff_duration_minutes),
    phases: (row.service_variant_phase ?? [])
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map(toServicePhase),
  };
}
