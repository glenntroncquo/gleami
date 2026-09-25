/**
 * EXAMPLE DATA layer. Toggled with EXPO_PUBLIC_USE_MOCKS=1.
 * Responses use the same shapes as the edge functions.
 */
import { PAGE_SIZE } from '@/src/config';
import { bboxCenter, distanceKm, inBBox } from '@/src/lib/geo';
import { galleryFromItem } from '@/src/api/gallery';
import { categoryById, MOCK_CATEGORIES, MOCK_SALONS, type MockSalon } from '@/src/api/mock-data';
import type {
  AvailabilityBucket,
  FavoriteSalon,
  LocationGetResponse,
  MarketplaceCategoryRow,
  NextAvailableRequest,
  NextAvailableResponse,
  SearchItem,
  SearchRequest,
  SearchResponse,
  SearchTreatment,
  SuggestRequest,
  SuggestResponse,
} from '@/src/api/types';

const likes = new Set<string>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function treatmentsFor(salon: MockSalon): SearchTreatment[] {
  return salon.services.flatMap((service) => {
    const variant = service.variants[0];
    if (!variant) return [];
    return [
      {
        serviceId: service.serviceId,
        serviceVariantId: variant.serviceVariantId,
        name: service.name,
      },
    ];
  });
}

function toItem(salon: MockSalon, origin: { lat: number; lng: number } | null): SearchItem {
  const distance = origin ? distanceKm(origin, { lat: salon.lat, lng: salon.lng }) : null;
  const textBoost = 0;
  const score = (salon.rating ?? 4) * 10 + salon.likeCount * 0.15 - (distance ?? 12) * 0.35 + textBoost;
  return {
    locationId: salon.locationId,
    companyId: salon.companyId,
    name: salon.name,
    slug: salon.slug,
    imageUrl: salon.imageUrl || null,
    images: galleryFromItem(salon.images, salon.imageUrl),
    city: salon.city,
    address: `${salon.street}, ${salon.postalCode} ${salon.city}`,
    lat: salon.lat,
    lng: salon.lng,
    distanceKm: distance == null ? null : Math.round(distance * 10) / 10,
    categoryIds: salon.categoryIds,
    treatments: treatmentsFor(salon),
    rating: salon.rating,
    reviewCount: salon.reviewCount,
    likeCount: salon.likeCount,
    score: Math.round(score * 100) / 100,
  };
}

function matchesQuery(salon: MockSalon, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const categoryNames = salon.categoryIds
    .map((categoryId) => categoryById(categoryId)?.name ?? '')
    .join(' ');
  const serviceNames = salon.services.map((service) => service.name).join(' ');
  const haystack = `${salon.name} ${salon.city} ${salon.street} ${categoryNames} ${serviceNames}`.toLowerCase();
  return haystack.includes(needle);
}

function encodeCursor(offset: number): string {
  return `off:${offset}`;
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor?.startsWith('off:')) return 0;
  const offset = Number(cursor.slice(4));
  return Number.isFinite(offset) && offset > 0 ? offset : 0;
}

export async function mockSearch(request: SearchRequest): Promise<SearchResponse> {
  await wait(120);
  const origin = request.center ?? (request.bbox ? bboxCenter(request.bbox) : null);
  let rows = MOCK_SALONS.filter((salon) => matchesQuery(salon, request.q ?? ''));
  if (request.categoryIds && request.categoryIds.length > 0) {
    const selected = new Set(request.categoryIds);
    rows = rows.filter((salon) => salon.categoryIds.some((categoryId) => selected.has(categoryId)));
  }
  if (request.bbox) {
    rows = rows.filter((salon) => inBBox(salon.lat, salon.lng, request.bbox!));
  } else if (request.center && request.radiusKm != null) {
    rows = rows.filter(
      (salon) => distanceKm(request.center!, { lat: salon.lat, lng: salon.lng }) <= request.radiusKm!,
    );
  }
  const items = rows
    .map((salon) => toItem(salon, origin))
    .sort((a, b) => b.score - a.score || a.locationId.localeCompare(b.locationId));
  const limit = request.limit && request.limit > 0 ? Math.min(request.limit, 50) : PAGE_SIZE;
  const offset = decodeCursor(request.cursor);
  const page = items.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    items: page,
    nextCursor: next < items.length ? encodeCursor(next) : null,
  };
}

export async function mockSuggest(request: SuggestRequest): Promise<SuggestResponse> {
  await wait(80);
  const needle = request.q.trim().toLowerCase();
  const limit = request.limit && request.limit > 0 ? request.limit : 8;
  if (!needle) return { items: [] };
  const items: SuggestResponse['items'] = [];
  for (const row of MOCK_CATEGORIES) {
    if (row.name.toLowerCase().includes(needle)) {
      items.push({ id: row.id, name: row.name, type: 'category', slug: row.slug });
    }
  }
  const seenServices = new Set<string>();
  for (const salon of MOCK_SALONS) {
    for (const service of salon.services) {
      const key = service.name.toLowerCase();
      if (seenServices.has(key) || !key.includes(needle)) continue;
      seenServices.add(key);
      items.push({ id: service.serviceId, name: service.name, type: 'service' });
    }
    if (salon.name.toLowerCase().includes(needle)) {
      items.push({
        id: salon.locationId,
        name: salon.name,
        type: 'location',
        slug: salon.slug,
        locationId: salon.locationId,
      });
    }
  }
  return { items: items.slice(0, limit) };
}

function bucketFor(locationId: string): AvailabilityBucket {
  const buckets: AvailabilityBucket[] = ['today', 'tomorrow', 'this_week', 'none_soon'];
  let hash = 0;
  for (const char of locationId) hash = (hash + char.charCodeAt(0)) % buckets.length;
  return buckets[hash] ?? 'none_soon';
}

export async function mockNextAvailable(request: NextAvailableRequest): Promise<NextAvailableResponse> {
  await wait(350);
  const results: NextAvailableResponse['results'] = {};
  for (const pair of request.pairs.slice(0, 24)) {
    results[pair.locationId] = bucketFor(pair.locationId);
  }
  return { results };
}

export async function mockLocation(slug: string): Promise<LocationGetResponse | null> {
  await wait(100);
  const salon = MOCK_SALONS.find((item) => item.slug === slug);
  if (!salon) return null;
  return {
    location: {
      locationId: salon.locationId,
      companyId: salon.companyId,
      name: salon.name,
      slug: salon.slug,
      description: salon.description,
      imageUrl: salon.imageUrl,
      images: salon.images,
      street: salon.street,
      postalCode: salon.postalCode,
      city: salon.city,
      country: salon.country,
      lat: salon.lat,
      lng: salon.lng,
      timezone: salon.timezone,
      likeCount: salon.likeCount,
    },
    categories: salon.categoryIds
      .map((categoryId) => categoryById(categoryId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    services: salon.services,
  };
}

export async function mockCategories(): Promise<MarketplaceCategoryRow[]> {
  await wait(40);
  return MOCK_CATEGORIES.filter(() => true).sort((a, b) => a.sort_order - b.sort_order);
}

export function mockLikedIds(): string[] {
  return [...likes];
}

export function mockSetLike(locationId: string, liked: boolean): void {
  const salon = MOCK_SALONS.find((item) => item.locationId === locationId);
  if (!salon) return;
  if (liked && !likes.has(locationId)) {
    likes.add(locationId);
    salon.likeCount += 1;
  } else if (!liked && likes.has(locationId)) {
    likes.delete(locationId);
    salon.likeCount = Math.max(0, salon.likeCount - 1);
  }
}

export async function mockFavorites(): Promise<FavoriteSalon[]> {
  await wait(80);
  return mockLikedIds()
    .map((locationId) => MOCK_SALONS.find((item) => item.locationId === locationId))
    .filter((item): item is MockSalon => Boolean(item))
    .map((salon) => ({
      locationId: salon.locationId,
      companyId: salon.companyId,
      name: salon.name,
      slug: salon.slug,
      imageUrl: salon.imageUrl || null,
      images: galleryFromItem(salon.images, salon.imageUrl),
      city: salon.city,
      likeCount: salon.likeCount,
    }));
}
