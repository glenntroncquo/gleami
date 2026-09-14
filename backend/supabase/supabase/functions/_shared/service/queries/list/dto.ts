import type { ServiceListItem } from "../../entity.ts";
import { clientFacingMinutes, staffOccupancyMinutes } from "../../../appointment/phases.ts";

export interface ServicePhaseDto {
  sequence: number;
  phase_type: "busy" | "free" | "buffer";
  duration_minutes: number;
  label: string | null;
}

export interface ServiceVariantDto {
  id: string;
  name: string;
  price: number;
  max_price: number | null;
  price_net: number | null;
  client_duration_minutes: number;
  staff_duration_minutes: number | null;
  staff_occupancy_minutes: number;
  image_path: string | null;
  order: number | null;
  phases: ServicePhaseDto[];
}

export interface ServiceListItemDto {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  order: number | null;
  booking_interval_minutes: number | null;
  service_variant: ServiceVariantDto[];
  /** @deprecated Same rows as service_variant; kept so mixed app PRs can still render the list. */
  price_option: Array<{
    id: string;
    name: string;
    price: number;
    max_price: number | null;
    duration_in_minutes: number;
    image_path: string | null;
    order: number | null;
  }>;
}

export function toServiceListItemDto(entity: ServiceListItem): ServiceListItemDto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    company_id: entity.companyId,
    order: entity.displayOrder,
    booking_interval_minutes: entity.bookingIntervalMinutes,
    service_variant: entity.variants.map((variant) => {
      const clientMinutes =
        variant.phases.length > 0
          ? clientFacingMinutes(variant.phases)
          : variant.clientDurationMinutes;
      const occupancyMinutes =
        variant.phases.length > 0
          ? staffOccupancyMinutes(variant.phases)
          : (variant.staffDurationMinutes ?? variant.clientDurationMinutes);
      return {
        id: variant.id,
        name: variant.name,
        price: variant.price,
        max_price: variant.maxPrice,
        price_net: variant.priceNet,
        client_duration_minutes: clientMinutes,
        staff_duration_minutes: variant.staffDurationMinutes,
        staff_occupancy_minutes: occupancyMinutes,
        image_path: variant.imagePath,
        order: variant.displayOrder,
        phases: variant.phases.map((phase) => ({
          sequence: phase.sequence,
          phase_type: phase.phaseType,
          duration_minutes: phase.durationMinutes,
          label: phase.label,
        })),
      };
    }),
    price_option: entity.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      max_price: variant.maxPrice,
      duration_in_minutes:
        variant.phases.length > 0
          ? clientFacingMinutes(variant.phases)
          : variant.clientDurationMinutes,
      image_path: variant.imagePath,
      order: variant.displayOrder,
    })),
  };
}
