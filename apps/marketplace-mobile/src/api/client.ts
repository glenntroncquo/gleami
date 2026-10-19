import { cardGallery, publicMarketplaceImageUrl, SEARCH_CARD_IMAGE_LIMIT } from '@/src/api/gallery';
import { supabaseUrl, useMocks } from '@/src/config';
import {
  mockCategories,
  mockFavorites,
  mockLikedIds,
  mockLocation,
  mockNextAvailable,
  mockSearch,
  mockSetLike,
  mockSuggest,
} from '@/src/api/mock';
import type {
  FavoriteSalon,
  LocationGetResponse,
  MarketplaceCategoryRow,
  NextAvailableRequest,
  NextAvailableResponse,
  SearchRequest,
  SearchResponse,
  SuggestRequest,
  SuggestResponse,
} from '@/src/api/types';
import { getMarketplaceLocale, type MarketplaceLocale } from '@/src/i18n';
import { getSupabase } from '@/src/lib/supabase';

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data == null) throw new Error('Leeg antwoord van de server.');
  return data;
}

export async function searchMarketplace(request: SearchRequest): Promise<SearchResponse> {
  if (useMocks) return mockSearch(request);
  const { data, error } = await getSupabase().functions.invoke<SearchResponse>('marketplace-search', {
    body: request,
  });
  return unwrap(data, error);
}

export async function suggestMarketplace(request: SuggestRequest): Promise<SuggestResponse> {
  if (useMocks) return mockSuggest(request);
  const { data, error } = await getSupabase().functions.invoke<SuggestResponse>('marketplace-suggest', {
    body: { ...request, locale: request.locale ?? getMarketplaceLocale() },
  });
  return unwrap(data, error);
}

export async function nextAvailable(request: NextAvailableRequest): Promise<NextAvailableResponse> {
  if (useMocks) return mockNextAvailable(request);
  const pairs = request.pairs.slice(0, 24);
  const { data, error } = await getSupabase().functions.invoke<NextAvailableResponse>(
    'marketplace-next-available',
    { body: { pairs } },
  );
  return unwrap(data, error);
}

/** Storage path or an already-public URL. Matches the web profile mapper. */
function marketplaceImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (!supabaseUrl || value.includes('..')) return null;
  return publicMarketplaceImageUrl(value, supabaseUrl);
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Same call as marketplace-web: public `marketplace_location` RPC.
 * The edge function opens Postgres with a database password the app does not have.
 */
function locationFromRpc(data: unknown): LocationGetResponse {
  if (!data || typeof data !== 'object') throw new Error('NOT_FOUND');
  const profile = data as {
    location?: Record<string, unknown>;
    categories?: unknown;
    services?: unknown;
  };
  const location = profile.location;
  if (!location || typeof location.slug !== 'string' || typeof location.locationId !== 'string') {
    throw new Error('NOT_FOUND');
  }

  const images = [
    ...new Set(
      (Array.isArray(location.images) ? location.images : [])
        .map(marketplaceImage)
        .filter((image): image is string => Boolean(image)),
    ),
  ];
  const imageUrl = marketplaceImage(location.imageUrl);
  const gallery = images.length > 0 ? images : imageUrl ? [imageUrl] : [];

  const categories = (Array.isArray(profile.categories) ? profile.categories : []).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.slug !== 'string') return [];
    return [{ id: row.id, name: row.name, slug: row.slug }];
  });

  const services = (Array.isArray(profile.services) ? profile.services : []).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.serviceId !== 'string' || typeof row.name !== 'string') return [];
    const variants = (Array.isArray(row.variants) ? row.variants : []).flatMap((variant) => {
      if (!variant || typeof variant !== 'object') return [];
      const option = variant as Record<string, unknown>;
      if (typeof option.serviceVariantId !== 'string' || typeof option.name !== 'string') return [];
      return [
        {
          serviceVariantId: option.serviceVariantId,
          name: option.name,
          price: asNumber(option.price) ?? 0,
          durationMinutes: asNumber(option.durationMinutes) ?? 0,
        },
      ];
    });
    return [
      {
        serviceId: row.serviceId,
        name: row.name,
        description: asText(row.description),
        variants,
      },
    ];
  });

  return {
    location: {
      locationId: location.locationId,
      companyId: asText(location.companyId),
      name: asText(location.name),
      slug: location.slug,
      description: asText(location.description),
      imageUrl: gallery[0] ?? '',
      images: gallery,
      street: asText(location.street),
      postalCode: asText(location.postalCode),
      city: asText(location.city),
      country: asText(location.country),
      lat: asNumber(location.lat),
      lng: asNumber(location.lng),
      timezone: asText(location.timezone),
      likeCount: asNumber(location.likeCount) ?? 0,
    },
    categories,
    services,
  };
}

export async function locationBySlug(
  slug: string,
  locale: MarketplaceLocale = getMarketplaceLocale(),
): Promise<LocationGetResponse> {
  if (useMocks) {
    const location = await mockLocation(slug);
    if (!location) throw new Error('NOT_FOUND');
    return location;
  }
  const { data, error } = await getSupabase().rpc('marketplace_location', {
    p_slug: slug,
    p_locale: locale,
  });
  if (error) throw new Error(error.message);
  return locationFromRpc(data);
}

type CategoryQueryRow = MarketplaceCategoryRow & {
  marketplace_category_translation?: Array<{ locale: string; name: string }> | null;
};

export async function listCategories(
  locale: MarketplaceLocale = getMarketplaceLocale(),
): Promise<MarketplaceCategoryRow[]> {
  if (useMocks) return mockCategories();
  const { data, error } = await getSupabase()
    .from('marketplace_category')
    .select('id,name,slug,sort_order,marketplace_category_translation(locale,name)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return ((data ?? []) as CategoryQueryRow[]).map((row) => {
    const translated = row.marketplace_category_translation?.find((item) => item.locale === locale)?.name;
    return {
      id: row.id,
      name: translated?.trim() || row.name,
      slug: row.slug,
      sort_order: row.sort_order,
    };
  });
}

export async function listLikedIds(userId: string): Promise<string[]> {
  if (useMocks) return mockLikedIds();
  const { data, error } = await getSupabase()
    .from('marketplace_location_like')
    .select('location_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String((row as { location_id: string }).location_id));
}

export async function addLike(userId: string, locationId: string): Promise<void> {
  if (useMocks) {
    mockSetLike(locationId, true);
    return;
  }
  const { error } = await getSupabase().from('marketplace_location_like').insert({
    user_id: userId,
    location_id: locationId,
  });
  if (error) throw new Error(error.message);
}

export async function removeLike(userId: string, locationId: string): Promise<void> {
  if (useMocks) {
    mockSetLike(locationId, false);
    return;
  }
  const { error } = await getSupabase()
    .from('marketplace_location_like')
    .delete()
    .eq('user_id', userId)
    .eq('location_id', locationId);
  if (error) throw new Error(error.message);
}

type ProjectionRow = {
  location_id: string;
  company_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  city: string | null;
  like_count: number | null;
};

type MediaRow = {
  location_id: string;
  storage_path: string;
  sort_order: number | null;
  id: string;
};

/** Preserve query order (sort_order, id) and keep the first five paths per location. */
function pathsByLocation(rows: MediaRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const paths = grouped.get(row.location_id) ?? [];
    if (paths.length >= SEARCH_CARD_IMAGE_LIMIT || row.storage_path.length === 0) continue;
    paths.push(row.storage_path);
    grouped.set(row.location_id, paths);
  }
  return grouped;
}

export async function listFavorites(userId: string): Promise<FavoriteSalon[]> {
  if (useMocks) return mockFavorites();
  const supabase = getSupabase();
  const { data: likeRows, error } = await supabase
    .from('marketplace_location_like')
    .select('location_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (likeRows ?? []).map((row) => String((row as { location_id: string }).location_id));
  if (ids.length === 0) return [];
  const { data: rows, error: rowError } = await supabase
    .from('marketplace_search_location')
    .select('location_id, company_id, name, slug, image_url, city, like_count')
    .in('location_id', ids);
  if (rowError) throw new Error(rowError.message);
  const { data: mediaRows, error: mediaError } = await supabase
    .from('marketplace_media')
    .select('location_id, storage_path, sort_order, id')
    .eq('type', 'IMAGE')
    .in('location_id', ids)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (mediaError) throw new Error(mediaError.message);
  const byId = new Map(
    ((rows ?? []) as ProjectionRow[]).map((row) => [row.location_id, row]),
  );
  const paths = pathsByLocation((mediaRows ?? []) as MediaRow[]);
  return ids.flatMap((locationId) => {
    const row = byId.get(locationId);
    if (!row?.slug || !row.name) return [];
    const images = cardGallery(paths.get(locationId) ?? [], row.image_url, supabaseUrl);
    return [
      {
        locationId,
        companyId: row.company_id,
        name: row.name,
        slug: row.slug,
        imageUrl: row.image_url,
        images,
        city: row.city ?? '',
        likeCount: Number(row.like_count ?? 0),
      },
    ];
  });
}
