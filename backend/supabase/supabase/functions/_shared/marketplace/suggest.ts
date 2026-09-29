import {
  DEFAULT_SUGGEST_LIMIT,
  MAX_SUGGEST_LIMIT,
} from "./ranking.ts";
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
    city?: string;
    detail?: string;
  }
  | {
    id: string;
    name: string;
    type: "location";
    slug: string;
    locationId?: string;
    city?: string;
    detail?: string;
  };

export function suggestItemFromRow(row: {
  id: string;
  name: string;
  type: SuggestItem["type"];
  slug: string | null;
  location_id: string | null;
  city?: string | null;
  detail?: string | null;
}): SuggestItem | null {
  const extra = {
    ...(row.city ? { city: row.city } : {}),
    ...(row.detail ? { detail: row.detail } : {}),
  };
  if (row.type === "location") {
    if (!row.slug) return null;
    return {
      id: row.id,
      name: row.name,
      type: "location",
      slug: row.slug,
      ...(row.location_id ? { locationId: row.location_id } : {}),
      ...extra,
    };
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    ...(row.slug ? { slug: row.slug } : {}),
    ...(row.location_id ? { locationId: row.location_id } : {}),
    ...extra,
  };
}

/**
 * One statement. Categories stay name matches. Locations match the search
 * document (salon name, city, categories, and treatment names), so a query
 * like "keratine" returns the salon that offers it rather than a treatment
 * with no salon attached. `detail` is the treatment name that matched.
 * Locations sort ahead of categories.
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
    city: string | null;
    detail: string | null;
  }[]>`
    select id, name, type, slug, location_id, city, detail
    from (
      (
        select
          c.id::text as id,
          c.name,
          'category'::text as type,
          c.slug,
          null::uuid as location_id,
          null::text as city,
          null::text as detail,
          greatest(
            extensions.similarity(lower(c.name), ${q}),
            extensions.word_similarity(${q}, lower(c.name))
          ) as sim,
          1 as kind
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
          m.location_id::text as id,
          m.name,
          'location'::text as type,
          m.slug,
          m.location_id,
          m.city,
          (
            select elem->>'name'
            from jsonb_array_elements(coalesce(m.treatments, '[]'::jsonb)) elem
            where lower(coalesce(elem->>'name', '')) ilike ${pattern} escape '\\'
            order by extensions.word_similarity(${q}, lower(coalesce(elem->>'name', ''))) desc
            limit 1
          ) as detail,
          greatest(
            extensions.word_similarity(${q}, m.search_text),
            extensions.word_similarity(${q}, lower(m.name))
          ) as sim,
          0 as kind
        from public.marketplace_search_location m
        where m.search_vector @@ plainto_tsquery('simple', ${q})
          or m.search_text ilike ${pattern} escape '\\'
        order by sim desc
        limit ${limit}
      )
    ) hits
    order by kind asc, sim desc, name asc
    limit ${limit}
  `;

  return {
    items: rows.flatMap((row) => {
      const item = suggestItemFromRow(row);
      return item ? [item] : [];
    }),
  };
}
