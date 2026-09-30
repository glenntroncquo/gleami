import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  addLike,
  listCategories,
  listFavorites,
  listLikedIds,
  locationBySlug,
  nextAvailable,
  removeLike,
  searchMarketplace,
} from '@/src/api/client';
import type { SearchResponse } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { PAGE_SIZE } from '@/src/config';
import { promoteMatchingTreatment } from '@/src/lib/search-match';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

function withMatchingTreatmentFirst(response: SearchResponse, q: string): SearchResponse {
  const trimmed = q.trim();
  if (!trimmed) return response;
  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      treatments: promoteMatchingTreatment(item.treatments, trimmed),
    })),
  };
}

export function useSearchResults() {
  const q = useDiscovery((state) => state.q);
  const categoryIds = useDiscovery((state) => state.categoryIds);
  const center = useDiscovery((state) => state.center);
  const radiusKm = useDiscovery((state) => state.radiusKm);
  const bbox = useDiscovery((state) => state.bbox);
  const online = useOnline();
  const trimmed = q.trim();
  const [debouncedCategoryIds, setDebouncedCategoryIds] = useState(categoryIds);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategoryIds(categoryIds), 250);
    return () => clearTimeout(timer);
  }, [categoryIds]);

  return useInfiniteQuery({
    // A typed query searches the catalog, so the map area is not part of the key.
    queryKey: ['search', trimmed, debouncedCategoryIds, trimmed ? null : bbox, trimmed ? null : center.lat, trimmed ? null : center.lng, trimmed ? null : radiusKm],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      searchMarketplace({
        q: trimmed || undefined,
        categoryIds: debouncedCategoryIds.length > 0 ? debouncedCategoryIds : undefined,
        cursor: pageParam,
        limit: PAGE_SIZE,
        ...(trimmed ? {} : bbox ? { bbox } : { center, radiusKm: radiusKm ?? undefined }),
      }).then((response) => withMatchingTreatmentFirst(response, trimmed)),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: online,
  });
}

/** Salon hits for the search field. Not limited to the current map area. */
export function useQuerySuggestions(q: string) {
  const online = useOnline();
  const trimmed = q.trim();
  return useQuery({
    queryKey: ['query-suggestions', trimmed],
    queryFn: () =>
      searchMarketplace({ q: trimmed, limit: 8 }).then((response) => withMatchingTreatmentFirst(response, trimmed)),
    enabled: online && trimmed.length > 0,
  });
}

export function useCategories() {
  const online = useOnline();
  return useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    enabled: online,
    staleTime: 5 * 60_000,
  });
}

export function useLocation(slug: string) {
  const online = useOnline();
  return useQuery({
    queryKey: ['location', slug],
    queryFn: () => locationBySlug(slug),
    enabled: online && slug.length > 0,
  });
}

export function useFavorites() {
  const { user } = useAuth();
  const online = useOnline();
  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => listFavorites(user!.id),
    enabled: online && Boolean(user),
  });
}

export function useLikedIds() {
  const { user } = useAuth();
  const online = useOnline();
  return useQuery({
    queryKey: ['liked-ids', user?.id],
    queryFn: async () => new Set(await listLikedIds(user!.id)),
    enabled: online && Boolean(user),
  });
}

export function useNextAvailable(pairs: { locationId: string; serviceId: string; serviceVariantId: string }[]) {
  const online = useOnline();
  const key = pairs.map((pair) => `${pair.locationId}:${pair.serviceVariantId}`).join('|');
  return useQuery({
    queryKey: ['next-available', key],
    queryFn: () => nextAvailable({ pairs: pairs.slice(0, 24) }),
    enabled: online && pairs.length > 0,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });
}

const pendingLikes = new Set<string>();

export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const likedQuery = useLikedIds();

  const mutation = useMutation({
    mutationFn: async (input: { locationId: string; liked: boolean }) => {
      if (!user) throw new Error('AUTH');
      if (input.liked) await removeLike(user.id, input.locationId);
      else await addLike(user.id, input.locationId);
    },
    onMutate: async (input) => {
      if (!user) return;
      const delta = input.liked ? -1 : 1;
      await queryClient.cancelQueries({ queryKey: ['liked-ids', user.id] });
      queryClient.setQueryData<Set<string>>(['liked-ids', user.id], (current) => {
        const next = new Set(current ?? []);
        if (input.liked) next.delete(input.locationId);
        else next.add(input.locationId);
        return next;
      });
      queryClient.setQueriesData<InfiniteData<SearchResponse>>({ queryKey: ['search'] }, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.locationId === input.locationId
                ? { ...item, likeCount: Math.max(0, item.likeCount + delta) }
                : item,
            ),
          })),
        };
      });
    },
    onError: (_error, input) => {
      queryClient.setQueryData<Set<string>>(['liked-ids', user?.id], (current) => {
        const next = new Set(current ?? []);
        if (input.liked) next.add(input.locationId);
        else next.delete(input.locationId);
        return next;
      });
      queryClient.setQueriesData<InfiniteData<SearchResponse>>({ queryKey: ['search'] }, (current) => current && ({
        ...current,
        pages: current.pages.map((page) => ({ ...page, items: page.items.map((item) =>
          item.locationId === input.locationId ? { ...item, likeCount: Math.max(0, item.likeCount + (input.liked ? 1 : -1)) } : item,
        ) })),
      }));
      Alert.alert('Favoriet niet opgeslagen', 'Je wijziging is teruggedraaid. Probeer het opnieuw.');
    },
    onSettled: async (_data, _error, input) => {
      try {
        // Background reconciliation must not reorder/remount the visible results.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
          queryClient.invalidateQueries({ queryKey: ['search'], refetchType: 'none' }),
          queryClient.invalidateQueries({ queryKey: ['location'], refetchType: 'none' }),
        ]);
      } finally {
        pendingLikes.delete(`${user?.id}:${input.locationId}`);
      }
    },
  });

  return {
    likedIds: likedQuery.data ?? new Set<string>(),
    toggle: (input: { locationId: string; liked: boolean }) => {
      if (!user) return;
      const key = `${user.id}:${input.locationId}`;
      if (pendingLikes.has(key)) return;
      pendingLikes.add(key);
      void Haptics.selectionAsync().catch(() => undefined);
      mutation.mutate(input);
    },
    pendingId: mutation.isPending ? mutation.variables?.locationId : undefined,
  };
}
