import { DEFAULT_SUGGEST_LIMIT, MAX_SUGGEST_LIMIT } from "./ranking.ts";
import type { MarketplaceSql } from "./sql.ts";
import { likeContainsPattern, normalizeQuery } from "./text-query.ts";

export interface SuggestInput {
  q: string;
  limit?: number;
}

export type SuggestItem =
  | {
    id: string;
    name: string;
    type: "category" | "service";
    slug?: string;
    locationId?: string;
  }
  | {
    id: string;
    name: string;
    type: "location";
    slug: string;
    locationId?: string;
  };

export function suggestItemFromRow(row: {
  id: string;
  name: string;
  type: SuggestItem["type"];
  slug: string | null;
  location_id: string | null;
}): SuggestItem | null {
  if (row.type === "location") {
    if (!row.slug) return null;
    return {
      id: row.id,
      name: row.name,
      type: "location",
      slug: row.slug,
      ...(row.location_id ? { locationId: row.location_id } : {}),
    };
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    ...(row.slug ? { slug: row.slug } : {}),
    ...(row.location_id ? { locationId: row.location_id } : {}),
  };
}

/**
 * One statement. Service rows are restricted to services offered at a listed
 * active location, then deduped by lower(name). Unlisted salons cannot leak
 * a service name through this query.
 *
 * Location hits are the nearest names by trigram distance
 * (`OPERATOR(extensions.<->)`), which the GiST index can satisfy with
 * `ORDER BY ... LIMIT`. The `%` / ILIKE form sequentially scanned the
 * projection once a few percent of names matched. PostGIS also defines
 * `<->`, so the operator is schema-qualified.
 */
export async function suggestMarketplace(sql: MarketplaceSql, input: SuggestInput): Promise<{ items: SuggestItem[] }> {
  const q = normalizeQuery(input.q);
  const pattern = likeContainsPattern(q);
  const limit = Math.min(input.limit ?? DEFAULT_SUGGEST_LIMIT, MAX_SUGGEST_LIMIT);

  const rows = await sql<{
    id: string;
    name: string;
    type: SuggestItem["type"];
    slug: string | null;
    location_id: string | null;
  }[]>`
    select id, name, type, slug, location_id
    from (
      (
        select
          c.id::text as id,
          c.name,
          'category'::text as type,
          c.slug,
          null::uuid as location_id,
          greatest(
            extensions.similarity(lower(c.name), ${q}),
            extensions.word_similarity(${q}, lower(c.name))
          ) as sim
        from public.marketplace_category c
        where c.is_active
          and (
            lower(c.name) operator(extensions.%) ${q}
            or lower(c.name) ilike ${pattern} escape '\\'
          )
        order by sim desc
        limit ${limit}
      )
      union all
      (
        select
          min(s.id::text) as id,
          min(s.name) as name,
          'service'::text as type,
          null::text as slug,
          null::uuid as location_id,
          max(greatest(
            extensions.similarity(lower(s.name), ${q}),
            extensions.word_similarity(${q}, lower(s.name))
          )) as sim
        from public.service s
        where coalesce(s.is_deleted, false) = false
          and coalesce(s.is_active, true) = true
          and s.is_marketplace_visible
          and (
            lower(s.name) operator(extensions.%) ${q}
            or lower(s.name) ilike ${pattern} escape '\\'
          )
          and exists (
            select 1
            from public.location_service ls
            join public.location l on l.id = ls.location_id
            where ls.service_id = s.id
              and l.is_listed
              and l.is_active
          )
        group by lower(s.name)
        order by sim desc
        limit ${limit}
      )
      union all
      (
        select
          m.location_id::text as id,
          m.name,
          'location'::text as type,
          m.slug,
          m.location_id,
          (1 - (lower(m.name) operator(extensions.<->) ${q})) as sim
        from public.marketplace_search_location m
        order by lower(m.name) operator(extensions.<->) ${q}
        limit ${limit}
      )
    ) hits
    order by sim desc, name asc
    limit ${limit}
  `;

  return {
    items: rows.flatMap((row) => {
      const item = suggestItemFromRow(row);
      return item ? [item] : [];
    }),
  };
}
