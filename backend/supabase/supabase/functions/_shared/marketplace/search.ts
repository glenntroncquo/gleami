import { encodeSearchCursor } from "./cursor.ts";
import { searchCardImages } from "./media-url.ts";
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from "./ranking.ts";

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
  images: string[];
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

export interface SearchRow {
  location_id: string;
  company_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  image_paths: string[] | null;
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

function asPathList(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.filter((path) => typeof path === "string");
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((path) => typeof path === "string") : [];
  } catch {
    return [];
  }
}

function num(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function treatmentMatchScore(name: string, needle: string): number {
  const normalized = name.toLowerCase();
  if (!normalized.includes(needle)) return -1;
  const words = normalized.split(/[^a-z0-9]+/).filter((word) => word.length > 0);
  if (words.some((word) => word === needle)) return 3;
  if (words.some((word) => word.startsWith(needle))) return 2;
  return 1;
}

/** Put the treatment that best matches the query first, so a card leads with it. */
export function promoteMatchingTreatment<T extends { name: string }>(treatments: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle || treatments.length < 2) return treatments;
  let best = -1;
  let bestScore = -1;
  treatments.forEach((treatment, index) => {
    const score = treatmentMatchScore(treatment.name, needle);
    const shorter = best >= 0 && score === bestScore && treatment.name.length < treatments[best].name.length;
    if (score > bestScore || shorter) {
      best = index;
      bestScore = score;
    }
  });
  if (best <= 0 || bestScore < 0) return treatments;
  return [treatments[best], ...treatments.slice(0, best), ...treatments.slice(best + 1)];
}

/** Turns one page of `marketplace_search` rows into the public response. */
export function mapSearchRows(
  rows: SearchRow[],
  input: Pick<SearchInput, "q" | "limit">,
  supabaseUrl: string,
): SearchResult {
  const limit = Math.min(input.limit ?? DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
  const q = input.q?.trim().toLowerCase() ?? "";
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
      images: searchCardImages(asPathList(row.image_paths), supabaseUrl),
      city: row.city,
      address: row.address ?? "",
      lat: Number(row.lat),
      lng: Number(row.lng),
      distanceKm: num(row.distance_km),
      categoryIds: row.category_ids ?? [],
      treatments: promoteMatchingTreatment(row.treatments ?? [], q),
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
