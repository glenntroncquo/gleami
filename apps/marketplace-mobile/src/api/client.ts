import { useMocks } from '@/src/config';
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
    body: request,
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

export async function locationBySlug(slug: string): Promise<LocationGetResponse> {
  if (useMocks) {
    const location = await mockLocation(slug);
    if (!location) throw new Error('NOT_FOUND');
    return location;
  }
  const { data, error } = await getSupabase().functions.invoke<LocationGetResponse>('marketplace-location-get', {
    body: { slug },
  });
  return unwrap(data, error);
}

export async function listCategories(): Promise<MarketplaceCategoryRow[]> {
  if (useMocks) return mockCategories();
  const { data, error } = await getSupabase()
    .from('marketplace_category')
    .select('id,name,slug,sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as MarketplaceCategoryRow[];
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
  const byId = new Map(
    ((rows ?? []) as ProjectionRow[]).map((row) => [row.location_id, row]),
  );
  return ids.flatMap((locationId) => {
    const row = byId.get(locationId);
    if (!row?.slug || !row.name) return [];
    return [
      {
        locationId,
        companyId: row.company_id,
        name: row.name,
        slug: row.slug,
        imageUrl: row.image_url,
        city: row.city ?? '',
        likeCount: Number(row.like_count ?? 0),
      },
    ];
  });
}
