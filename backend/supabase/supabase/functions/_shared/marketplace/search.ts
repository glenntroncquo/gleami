import { decodeSearchCursor, encodeSearchCursor } from "./cursor.ts";
import {
  DEFAULT_RADIUS_KM,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  RANKING,
} from "./ranking.ts";
import type { MarketplaceSql } from "./sql.ts";
import { likeContainsPattern, normalizeQuery } from "./text-query.ts";

export interface SearchBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface SearchInput {
  bbox?: SearchBbox;
  center?: { lat: number; lng: number };
  radiusKm?: number;
  categoryIds?: string[];
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchItem {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  city: string | null;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  categoryIds: string[];
  treatments: Array<{ serviceId: string; serviceVariantId: string; name: string }>;
  rating: number | null;
  reviewCount: number;
  likeCount: number;
  score: number;
}

export interface SearchResult {
  items: SearchItem[];
  nextCursor: string | null;
}

interface SearchRow {
  location_id: string;
  company_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  city: string | null;
  address: string | null;
  lat: number;
  lng: number;
  distance_km: number | null;
  category_ids: string[] | null;
  treatments: SearchItem["treatments"] | null;
  rating: number | string | null;
  review_count: number;
  like_count: number;
  score: number | string;
}

function num(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * One statement. Predicates that are not requested are the constant TRUE,
 * which Postgres folds away, so a bbox-only call keeps the GiST predicate
 * and a text call keeps the FTS / trigram predicates.
 *
 * Text match is FTS (`@@ plainto_tsquery('simple', q)`) OR a trigram ILIKE
 * on search_text. The `%` similarity operator under-matches short queries
 * against a long search_text; ILIKE is the gin_trgm_ops fallback. Ranking
 * still uses word_similarity, which scores the best matching slice.
 */
export async function searchMarketplace(sql: MarketplaceSql, input: SearchInput): Promise<SearchResult> {
  const limit = Math.min(input.limit ?? DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
  const q = input.q ? normalizeQuery(input.q) : "";
  const hasQ = q.length > 0;
  const pattern = hasQ ? likeContainsPattern(q) : "";
  const categoryIds = (input.categoryIds ?? []).filter((id) => id.length > 0);
  const hasCategories = categoryIds.length > 0;
  const hasBbox = Boolean(input.bbox);
  const hasCenter = Boolean(input.center);
  const radiusM = (input.radiusKm ?? DEFAULT_RADIUS_KM) * 1000;
  const cursor = input.cursor ? decodeSearchCursor(input.cursor) : null;
  if (input.cursor && !cursor) {
    throw new SearchCursorError("Invalid cursor");
  }

  const bbox = input.bbox;
  const center = input.center;
  const distanceExpr = hasCenter && center
    ? sql`st_distance(m.coordinates, st_setsrid(st_makepoint(${center.lng}, ${center.lat}), 4326)::geography) / 1000.0`
    : sql`null::float8`;
  const textScoreExpr = hasQ
    ? sql`${RANKING.text}::float8 * ts_rank_cd(m.search_vector, plainto_tsquery('simple', ${q}))
        + ${RANKING.trigram}::float8 * extensions.word_similarity(${q}, m.search_text)`
    : sql`0::float8`;
  const geoScoreExpr = hasCenter && center
    ? sql`${RANKING.geo}::float8 * (1.0 / (1.0 + (
        st_distance(m.coordinates, st_setsrid(st_makepoint(${center.lng}, ${center.lat}), 4326)::geography) / 1000.0
      )))`
    : sql`0::float8`;
  const bboxExpr = hasBbox && bbox
    ? sql`st_intersects(m.coordinates, st_makeenvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)::geography)`
    : sql`true`;
  const radiusExpr = hasCenter && center
    ? sql`st_dwithin(m.coordinates, st_setsrid(st_makepoint(${center.lng}, ${center.lat}), 4326)::geography, ${radiusM})`
    : sql`true`;
  const categoryExpr = hasCategories
    ? sql`m.category_ids && ${categoryIds}::uuid[]`
    : sql`true`;
  const textExpr = hasQ
    ? sql`(
        m.search_vector @@ plainto_tsquery('simple', ${q})
        or m.search_text ilike ${pattern} escape '\\'
      )`
    : sql`true`;
  const cursorExpr = cursor
    ? sql`(
        score < ${cursor.score}::float8
        or (score = ${cursor.score}::float8 and location_id > ${cursor.locationId}::uuid)
      )`
    : sql`true`;

  const rows = await sql<SearchRow[]>`
    select
      location_id,
      company_id,
      name,
      slug,
      image_url,
      city,
      address,
      lat,
      lng,
      distance_km,
      category_ids,
      treatments,
      rating,
      review_count,
      like_count,
      score
    from (
      select
        m.location_id,
        m.company_id,
        m.name,
        m.slug,
        m.image_url,
        m.city,
        concat_ws(', ', nullif(btrim(m.street), ''), nullif(btrim(m.postal_code), '')) as address,
        st_y(m.coordinates::geometry)::float8 as lat,
        st_x(m.coordinates::geometry)::float8 as lng,
        ${distanceExpr} as distance_km,
        m.category_ids,
        m.treatments,
        m.rating,
        m.review_count,
        m.like_count,
        round((
          ${textScoreExpr}
          + ${geoScoreExpr}
          + ${RANKING.rating}::float8 * (coalesce(m.rating, 0) / 5.0)
          + ${RANKING.likes}::float8 * ln(1 + m.like_count)
        )::numeric, 6)::float8 as score
      from public.marketplace_search_location m
      where ${bboxExpr}
        and ${radiusExpr}
        and ${categoryExpr}
        and ${textExpr}
    ) ranked
    where ${cursorExpr}
    order by score desc, location_id asc
    limit ${limit + 1}
  `;

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor = rows.length > limit && last
    ? encodeSearchCursor(Number(last.score), last.location_id)
    : null;

  return {
    items: page.map((row) => ({
      locationId: row.location_id,
      companyId: row.company_id,
      name: row.name,
      slug: row.slug,
      imageUrl: row.image_url,
      city: row.city,
      address: row.address ?? "",
      lat: Number(row.lat),
      lng: Number(row.lng),
      distanceKm: num(row.distance_km),
      categoryIds: row.category_ids ?? [],
      treatments: row.treatments ?? [],
      rating: num(row.rating),
      reviewCount: row.review_count,
      likeCount: row.like_count,
      score: Number(row.score),
    })),
    nextCursor,
  };
}

export class SearchCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchCursorError";
  }
}
