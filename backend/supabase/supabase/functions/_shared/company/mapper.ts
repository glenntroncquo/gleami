import type { Database } from "@/types/database";
import type { Company, NearbyCompany } from "./entity.ts";

type CompanyRow = Database["public"]["Tables"]["company"]["Row"];

type NearbyCompanyRow = {
  id: string;
  name: string;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
};

export function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    email: row.email,
    street: row.street,
    city: row.city,
    postalCode: row.postal_code,
    state: row.state,
    country: row.country,
    slug: row.slug,
    imageUrl: row.image_url,
    multiLocationEnabled: Boolean(
      (row as { multi_location_enabled?: boolean }).multi_location_enabled,
    ),
    geoLocation: row.geo_location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toNearbyCompany(row: NearbyCompanyRow): NearbyCompany {
  return {
    id: row.id,
    name: row.name,
    street: row.street,
    postalCode: row.postal_code,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceM: row.distance_m,
  };
}
