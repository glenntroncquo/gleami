/**
 * Marketplace edge-function contract. Another PR owns the backend.
 * Field names here match that contract; do not rename them to the
 * underlying Postgres columns.
 */

export type BBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type LatLng = {
  lat: number;
  lng: number;
};

export type SearchTreatment = {
  serviceId: string;
  serviceVariantId: string;
  name: string;
};

export type SearchRequest = {
  bbox?: BBox;
  center?: LatLng;
  radiusKm?: number;
  categoryIds?: string[];
  q?: string;
  cursor?: string;
  limit?: number;
};

export type SearchItem = {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  imageUrl: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  categoryIds: string[];
  treatments: SearchTreatment[];
  rating: number | null;
  reviewCount: number;
  likeCount: number;
  score: number;
};

export type SearchResponse = {
  items: SearchItem[];
  nextCursor: string | null;
};

export type SuggestRequest = {
  q: string;
  limit?: number;
};

export type SuggestItem = {
  id: string;
  name: string;
  type: 'category' | 'service' | 'location';
  slug?: string;
  locationId?: string;
};

export type SuggestResponse = {
  items: SuggestItem[];
};

export type AvailabilityPair = {
  locationId: string;
  serviceId: string;
  serviceVariantId: string;
};

export type NextAvailableRequest = {
  pairs: AvailabilityPair[];
};

export type AvailabilityBucket = 'today' | 'tomorrow' | 'this_week' | 'none_soon';

export type NextAvailableResponse = {
  results: Record<string, AvailabilityBucket>;
};

export type LocationGetRequest = {
  slug: string;
};

export type ServiceVariant = {
  serviceVariantId: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type LocationService = {
  serviceId: string;
  name: string;
  description: string;
  variants: ServiceVariant[];
};

export type LocationCategory = {
  id: string;
  name: string;
  slug: string;
};

export type LocationGetResponse = {
  location: {
    locationId: string;
    companyId: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    images: string[];
    street: string;
    postalCode: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    timezone: string;
    likeCount: number;
  };
  categories: LocationCategory[];
  services: LocationService[];
};

/** Direct read: marketplace_category (snake_case, as PostgREST returns it). */
export type MarketplaceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

/**
 * Client view of a liked salon. There is no favorites edge function.
 * Live mode hydrates this from marketplace_location_like plus a public
 * read of marketplace_search_location. See the PR notes.
 */
export type FavoriteSalon = {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  city: string;
  likeCount: number;
};
