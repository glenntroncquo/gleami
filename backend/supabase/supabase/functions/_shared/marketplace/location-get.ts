import { publicMarketplaceImageUrl } from "./media-url.ts";
import type { MarketplaceSql } from "./sql.ts";

/** service_variant has no currency column. Marketplace prices are euros. */
export const MARKETPLACE_CURRENCY = "EUR" as const;

export interface LocationProfile {
  location: {
    locationId: string;
    companyId: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    images: string[];
    street: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
    timezone: string;
    likeCount: number;
  };
  categories: Array<{ id: string; name: string; slug: string }>;
  services: Array<{
    serviceId: string;
    name: string;
    description: string | null;
    variants: Array<{
      serviceVariantId: string;
      name: string;
      price: number;
      durationMinutes: number;
      currency: typeof MARKETPLACE_CURRENCY;
    }>;
  }>;
}

interface ProfileRow {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  images: string[] | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string;
  like_count: number;
  categories: LocationProfile["categories"] | null;
  services: LocationProfile["services"] | null;
}

function asNumber(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Listed + active only. Slug match is case-insensitive, matching
 * location_listed_slug_key. Service and variant fields follow service-list
 * (price, client_duration_minutes) but the filter is marketplace-specific:
 * location_service, is_marketplace_visible, and not deleted.
 */
export async function getMarketplaceLocation(
  sql: MarketplaceSql,
  slug: string,
  supabaseUrl: string,
): Promise<LocationProfile | null> {
  const rows = await sql<ProfileRow[]>`
    select
      l.id,
      l.company_id,
      l.name,
      l.slug,
      l.marketplace_description as description,
      l.image_url,
      coalesce((
        select json_agg(m.storage_path order by m.sort_order, m.id)
        from public.marketplace_media m
        where m.location_id = l.id
          and m.type = 'IMAGE'
      ), '[]'::json) as images,
      l.street,
      l.postal_code,
      l.city,
      l.country,
      case when l.geo_location is null then null else st_y(l.geo_location::geometry)::float8 end as lat,
      case when l.geo_location is null then null else st_x(l.geo_location::geometry)::float8 end as lng,
      l.timezone,
      (
        select count(*)::int
        from public.marketplace_location_like k
        where k.location_id = l.id
      ) as like_count,
      coalesce((
        select json_agg(json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) order by c.sort_order)
        from public.marketplace_category c
        where c.is_active
          and c.id in (
            select smc.marketplace_category_id
            from public.location_service ls
            join public.service s on s.id = ls.service_id
            join public.service_marketplace_category smc on smc.service_id = s.id
            where ls.location_id = l.id
              and coalesce(s.is_deleted, false) = false
              and coalesce(s.is_active, true) = true
              and s.is_marketplace_visible
          )
      ), '[]'::json) as categories,
      coalesce((
        select json_agg(json_build_object(
          'serviceId', s.id,
          'name', s.name,
          'description', s.description,
          'variants', coalesce((
            select json_agg(json_build_object(
              'serviceVariantId', v.id,
              'name', v.name,
              'price', v.price,
              'durationMinutes', v.client_duration_minutes
            ) order by v.display_order nulls last, v.id)
            from public.service_variant v
            where v.service_id = s.id
              and coalesce(v.is_deleted, false) = false
              and coalesce(v.is_active, true) = true
          ), '[]'::json)
        ) order by s.display_order nulls last, s.name)
        from public.location_service ls
        join public.service s on s.id = ls.service_id
        where ls.location_id = l.id
          and coalesce(s.is_deleted, false) = false
          and coalesce(s.is_active, true) = true
          and s.is_marketplace_visible
      ), '[]'::json) as services
    from public.location l
    where lower(l.slug) = lower(${slug})
      and l.is_listed
      and l.is_active
    limit 1
  `;

  const row = rows[0];
  if (!row || !row.slug) return null;

  const services = (row.services ?? []).map((service) => ({
    serviceId: service.serviceId,
    name: service.name,
    description: service.description,
    variants: (service.variants ?? []).map((variant) => ({
      serviceVariantId: variant.serviceVariantId,
      name: variant.name,
      price: asNumber(variant.price) ?? 0,
      durationMinutes: asNumber(variant.durationMinutes) ?? 0,
      currency: MARKETPLACE_CURRENCY,
    })),
  }));

  return {
    location: {
      locationId: row.id,
      companyId: row.company_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      images: (row.images ?? []).map((path) => publicMarketplaceImageUrl(path, supabaseUrl)),
      street: row.street,
      postalCode: row.postal_code,
      city: row.city,
      country: row.country,
      lat: asNumber(row.lat),
      lng: asNumber(row.lng),
      timezone: row.timezone,
      likeCount: row.like_count,
    },
    categories: row.categories ?? [],
    services,
  };
}
