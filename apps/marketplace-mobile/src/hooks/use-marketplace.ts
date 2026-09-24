import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import {
  addLike,
  listCategories,
  listFavorites,
  listLikedIds,
  locationBySlug,
  nextAvailable,
  removeLike,
  searchMarketplace,
  suggestMarketplace,
} from '@/src/api/client';
import type { SearchResponse } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { PAGE_SIZE } from '@/src/config';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

export function useSearchResults() {
  const q = useDiscovery((state) => state.q);
  const categoryIds = useDiscovery((state) => state.categoryIds);
  const center = useDiscovery((state) => state.center);
  const radiusKm = useDiscovery((state) => state.radiusKm);
  const bbox = useDiscovery((state) => state.bbox);
  const online = useOnline();

  return useInfiniteQuery({
    queryKey: ['search', q, categoryIds, bbox, center.lat, center.lng, radiusKm],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      searchMarketplace({
        q: q.trim() || undefined,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        cursor: pageParam,
        limit: PAGE_SIZE,
        ...(bbox ? { bbox } : { center, radiusKm: radiusKm ?? undefined }),
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: online,
  });
}

export function useSuggestions(q: string) {
  const online = useOnline();
  const trimmed = q.trim();
  return useQuery({
    queryKey: ['suggest', trimmed],
    queryFn: () => suggestMarketplace({ q: trimmed, limit: 8 }),
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
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['liked-ids'] });
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
      await queryClient.invalidateQueries({ queryKey: ['search'] });
      await queryClient.invalidateQueries({ queryKey: ['location'] });
    },
  });

  return {
    likedIds: likedQuery.data ?? new Set<string>(),
    toggle: mutation.mutate,
    pendingId: mutation.isPending ? mutation.variables?.locationId : undefined,
  };
}
