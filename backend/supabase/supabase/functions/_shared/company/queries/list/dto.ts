import type { NearbyCompany } from "../../entity.ts";

export interface NearbyCompanyResponseDto {
  id: string;
  name: string;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
}

export function toNearbyCompanyResponseDto(entity: NearbyCompany): NearbyCompanyResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    street: entity.street,
    postal_code: entity.postalCode,
    city: entity.city,
    latitude: entity.latitude,
    longitude: entity.longitude,
    distance_m: entity.distanceM,
  };
}
