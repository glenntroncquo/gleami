import type { MarketplaceSql } from "./sql.ts";

/**
 * One set-based recount. Rows with no likes become 0 because the subquery
 * left-joins every projection row. Does not touch updated_at (that column
 * is the sync clock). Redelivery is a no-op when counts already match.
 */
export async function refreshLikeCounts(sql: MarketplaceSql): Promise<number> {
  const rows = await sql<{ location_id: string }[]>`
    with counts as (
      select location_id, count(*)::int as like_count
      from public.marketplace_location_like
      group by location_id
    )
    update public.marketplace_search_location p
    set like_count = coalesce(src.like_count, 0)
    from (
      select p2.location_id, counts.like_count
      from public.marketplace_search_location p2
      left join counts on counts.location_id = p2.location_id
    ) src
    where src.location_id = p.location_id
      and p.like_count is distinct from coalesce(src.like_count, 0)
    returning p.location_id
  `;
  return rows.length;
}
