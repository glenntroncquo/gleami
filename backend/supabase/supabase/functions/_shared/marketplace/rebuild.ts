import {
  buildMarketplaceSearchDocument,
  type CategoryName,
  type LocationSource,
  type ProjectionDocument,
  type ServiceSource,
  type VariantSource,
} from "./document.ts";
import type { MarketplaceSql } from "./sql.ts";

interface VariantJson {
  id: string;
  displayOrder: number | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
}

interface ServiceJson {
  id: string;
  name: string;
  isActive: boolean | null;
  isDeleted: boolean | null;
  isMarketplaceVisible: boolean;
  categoryIds: string[] | null;
  variants: VariantJson[] | null;
}

interface LocationJson {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  is_listed: boolean;
  is_active: boolean;
  has_coordinates: boolean;
  like_count: number;
  services: ServiceJson[] | null;
  categories: Array<{ id: string; name: string }> | null;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toSource(row: LocationJson): LocationSource {
  const services: ServiceSource[] = asArray(row.services).map((service) => ({
    id: service.id,
    name: service.name,
    isActive: service.isActive,
    isDeleted: service.isDeleted,
    isMarketplaceVisible: service.isMarketplaceVisible,
    categoryIds: asArray(service.categoryIds),
    variants: asArray(service.variants).map((variant): VariantSource => ({
      id: variant.id,
      displayOrder: variant.displayOrder,
      isActive: variant.isActive,
      isDeleted: variant.isDeleted,
    })),
  }));

  const categories: CategoryName[] = asArray(row.categories).map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    street: row.street,
    postalCode: row.postal_code,
    city: row.city,
    country: row.country,
    timezone: row.timezone,
    isListed: row.is_listed,
    isActive: row.is_active,
    hasCoordinates: row.has_coordinates,
    likeCount: row.like_count,
    services,
    categories,
  };
}

async function readLocation(sql: MarketplaceSql, locationId: string): Promise<LocationSource | null> {
  const rows = await sql<LocationJson[]>`
    select
      l.id,
      l.company_id,
      l.name,
      l.slug,
      l.image_url,
      l.street,
      l.postal_code,
      l.city,
      l.country,
      l.timezone,
      l.is_listed,
      l.is_active,
      (l.geo_location is not null) as has_coordinates,
      (
        select count(*)::int
        from public.marketplace_location_like k
        where k.location_id = l.id
      ) as like_count,
      coalesce((
        select json_agg(json_build_object(
          'id', s.id,
          'name', s.name,
          'isActive', s.is_active,
          'isDeleted', s.is_deleted,
          'isMarketplaceVisible', s.is_marketplace_visible,
          'categoryIds', coalesce((
            select json_agg(smc.marketplace_category_id)
            from public.service_marketplace_category smc
            where smc.service_id = s.id
          ), '[]'::json),
          'variants', coalesce((
            select json_agg(json_build_object(
              'id', v.id,
              'displayOrder', v.display_order,
              'isActive', v.is_active,
              'isDeleted', v.is_deleted
            ) order by v.display_order nulls last, v.id)
            from public.service_variant v
            where v.service_id = s.id
          ), '[]'::json)
        ))
        from public.location_service ls
        join public.service s on s.id = ls.service_id
        where ls.location_id = l.id
      ), '[]'::json) as services,
      coalesce((
        select json_agg(json_build_object('id', c.id, 'name', c.name))
        from public.marketplace_category c
        where c.is_active
      ), '[]'::json) as categories
    from public.location l
    where l.id = ${locationId}::uuid
  `;

  const row = rows[0];
  return row ? toSource(row) : null;
}

async function writeDocument(sql: MarketplaceSql, locationId: string, document: ProjectionDocument | null): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      delete from public.marketplace_search_location p
      where p.location_id = ${locationId}::uuid
        and not exists (
          select 1
          from public.location l
          where l.id = p.location_id
            and l.is_listed
            and l.is_active
            and l.geo_location is not null
            and nullif(btrim(l.slug), '') is not null
        )
    `;

    if (!document) return;

    await tx`
      insert into public.marketplace_search_location (
        location_id,
        company_id,
        name,
        slug,
        image_url,
        street,
        postal_code,
        city,
        country,
        timezone,
        coordinates,
        category_ids,
        search_text,
        treatments,
        like_count,
        rating,
        review_count,
        updated_at
      )
      select
        l.id,
        l.company_id,
        ${document.name},
        ${document.slug},
        ${document.imageUrl},
        ${document.street},
        ${document.postalCode},
        ${document.city},
        ${document.country},
        ${document.timezone},
        l.geo_location,
        ${document.categoryIds}::uuid[],
        ${document.searchText},
        ${JSON.stringify(document.treatments)}::jsonb,
        ${document.likeCount},
        null,
        0,
        now()
      from public.location l
      where l.id = ${locationId}::uuid
        and l.is_listed
        and l.is_active
        and l.geo_location is not null
        and nullif(btrim(l.slug), '') is not null
      on conflict (location_id) do update set
        company_id = excluded.company_id,
        name = excluded.name,
        slug = excluded.slug,
        image_url = excluded.image_url,
        street = excluded.street,
        postal_code = excluded.postal_code,
        city = excluded.city,
        country = excluded.country,
        timezone = excluded.timezone,
        coordinates = excluded.coordinates,
        category_ids = excluded.category_ids,
        search_text = excluded.search_text,
        treatments = excluded.treatments,
        like_count = excluded.like_count,
        updated_at = now()
    `;

    await tx`
      update public.location
      set marketplace_published_at = now()
      where id = ${locationId}::uuid
        and is_listed
        and marketplace_published_at is null
    `;
  });
}

/** Idempotent. Reads database truth, recounts likes, upserts or deletes. */
export async function rebuildMarketplaceSearchLocation(
  sql: MarketplaceSql,
  locationId: string,
): Promise<"upserted" | "deleted" | "missing"> {
  const source = await readLocation(sql, locationId);
  if (!source) {
    await writeDocument(sql, locationId, null);
    return "missing";
  }

  const document = buildMarketplaceSearchDocument(source);
  await writeDocument(sql, locationId, document);
  return document ? "upserted" : "deleted";
}

export async function locationIdsForService(sql: MarketplaceSql, serviceId: string): Promise<string[]> {
  const rows = await sql<{ location_id: string }[]>`
    select distinct ls.location_id
    from public.location_service ls
    where ls.service_id = ${serviceId}::uuid
  `;
  return rows.map((row) => row.location_id);
}

export async function rebuildLocations(sql: MarketplaceSql, locationIds: string[]): Promise<number> {
  const unique = [...new Set(locationIds)];
  for (const locationId of unique) {
    await rebuildMarketplaceSearchLocation(sql, locationId);
  }
  return unique.length;
}

/** Deletes projection rows that are no longer indexable, then rebuilds every listed active location. */
export async function rebuildAllListed(sql: MarketplaceSql): Promise<{ rebuilt: number; removed: number }> {
  const removed = await sql<{ location_id: string }[]>`
    delete from public.marketplace_search_location p
    where not exists (
      select 1
      from public.location l
      where l.id = p.location_id
        and l.is_listed
        and l.is_active
        and l.geo_location is not null
        and nullif(btrim(l.slug), '') is not null
    )
    returning p.location_id
  `;

  const listed = await sql<{ id: string }[]>`
    select l.id
    from public.location l
    where l.is_listed
      and l.is_active
    order by l.id
  `;

  for (const row of listed) {
    await rebuildMarketplaceSearchLocation(sql, row.id);
  }

  return { rebuilt: listed.length, removed: removed.length };
}
