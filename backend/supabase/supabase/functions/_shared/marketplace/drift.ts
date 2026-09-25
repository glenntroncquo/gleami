import type { MarketplaceSql } from "./sql.ts";
import { rebuildAllListed } from "./rebuild.ts";

export interface DriftReport {
  locationUpdatedAtNull: number;
  serviceUpdatedAtNull: number;
  projectionOlderThanLocation: number;
  listedMissingFromProjection: number;
  rebuilt: number;
  removed: number;
}

/**
 * location.updated_at and service.updated_at are nullable and this repo has
 * no BEFORE UPDATE trigger that stamps them (adding one would be a new
 * function, which is forbidden). A timestamp comparison therefore misses
 * service edits made by clients that do not send updated_at, and misses
 * variant changes (service_variant is not webhooked).
 *
 * The scheduled job logs the comparison, then rebuilds every listed location
 * from database truth. That is the staleness strategy.
 */
export async function runDriftCheck(sql: MarketplaceSql): Promise<DriftReport> {
  const rows = await sql<{
    location_updated_at_null: number;
    service_updated_at_null: number;
    projection_older_than_location: number;
    listed_missing_from_projection: number;
  }[]>`
    select
      count(*) filter (where l.updated_at is null)::int as location_updated_at_null,
      count(*) filter (where svc.updated_at is null)::int as service_updated_at_null,
      count(*) filter (
        where p.updated_at is not null
          and l.updated_at is not null
          and p.updated_at < l.updated_at
      )::int as projection_older_than_location,
      count(*) filter (
        where p.location_id is null
          and l.geo_location is not null
          and nullif(btrim(l.slug), '') is not null
      )::int as listed_missing_from_projection
    from public.location l
    left join public.marketplace_search_location p on p.location_id = l.id
    left join lateral (
      select max(s.updated_at) as updated_at
      from public.location_service ls
      join public.service s on s.id = ls.service_id
      where ls.location_id = l.id
    ) svc on true
    where l.is_listed
      and l.is_active
  `;

  const report = rows[0];
  const rebuilt = await rebuildAllListed(sql);

  return {
    locationUpdatedAtNull: report?.location_updated_at_null ?? 0,
    serviceUpdatedAtNull: report?.service_updated_at_null ?? 0,
    projectionOlderThanLocation: report?.projection_older_than_location ?? 0,
    listedMissingFromProjection: report?.listed_missing_from_projection ?? 0,
    rebuilt: rebuilt.rebuilt,
    removed: rebuilt.removed,
  };
}
