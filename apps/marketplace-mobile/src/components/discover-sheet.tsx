import { usePullRefresh } from '@/src/hooks/use-pull-refresh';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SearchItem } from '@/src/api/types';
import { ResultCard } from '@/src/components/result-card';
import { ErrorState, OfflineBanner, OfflineState } from '@/src/components/screen-state';
import { ResultCardSkeleton } from '@/src/components/skeleton';
import { useNextAvailable, useSearchResults } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useOnline } from '@/src/lib/online';
import { DiscoveryFilters } from '@/src/components/discovery-filters';
import { useDiscovery } from '@/src/store/discovery';
import { brandColors as colors } from '@/src/theme/colors';
import { DEFAULT_RADIUS_KM } from '@/src/config';

/** Grabber (8 + 4 + 8) above the 44pt title/filters row. Also the collapsed height. */
const HANDLE_HEIGHT = 64;

export function DiscoverSheet({ topInset }: { topInset: number }) {
  const insets = useSafeAreaInsets();
  // Native tabs already contribute their height to the screen's bottom safe area.
  const tabClearance = insets.bottom + (Platform.OS === 'ios' ? 0 : 74);
  const sheet = useRef<BottomSheet>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categoryCount = useDiscovery((state) => state.categoryIds.length);
  const radius = useDiscovery((state) => state.radiusKm);
  const filterCount = categoryCount + (radius != null && radius !== DEFAULT_RADIUS_KM ? 1 : 0);
  const online = useOnline();
  const search = useSearchResults();
  const pullRefresh = usePullRefresh(search.refetch);
  const items = useMemo(
    () => search.data?.pages.flatMap((page) => page.items) ?? [],
    [search.data],
  );
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: SearchItem }[] }) => {
      const ids = viewableItems.map((entry) => entry.item.locationId).slice(0, 24);
      // A collapsed sheet reports nothing visible. Keeping the last set stops
      // the availability query key from flip-flopping as the sheet is dragged.
      if (ids.length === 0) return;
      setVisibleIds((current) =>
        current?.length === ids.length && current.every((id, index) => id === ids[index]) ? current : ids,
      );
    },
    [],
  );

  const rendered = useMemo(() => {
    if (visibleIds && visibleIds.length > 0) {
      const allowed = new Set(visibleIds);
      return items.filter((item) => allowed.has(item.locationId)).slice(0, 24);
    }
    return items.slice(0, 20);
  }, [items, visibleIds]);

  const pairs = useMemo(
    () =>
      rendered.flatMap((item) => {
        const treatment = item.treatments[0];
        if (!treatment) return [];
        return [
          {
            locationId: item.locationId,
            serviceId: treatment.serviceId,
            serviceVariantId: treatment.serviceVariantId,
          },
        ];
      }),
    [rendered],
  );
  const availability = useNextAvailable(pairs);
  const renderedIds = useMemo(() => new Set(rendered.map((item) => item.locationId)), [rendered]);

  const snapPoints = useMemo(() => [tabClearance + HANDLE_HEIGHT, '58%', '100%'], [tabClearance]);

  // Stable identity: an inline renderItem re-renders every card (and reloads
  // every carousel image) on each viewability tick.
  const renderItem = useCallback(
    ({ item }: { item: SearchItem }) => {
      const status = availability.data?.results[item.locationId];
      const loading = !status && availability.isFetching && renderedIds.has(item.locationId);
      return <ResultCard item={item} availability={status} availabilityLoading={loading} />;
    },
    [availability.data, availability.isFetching, renderedIds],
  );

  const body = () => {
    if (!online && items.length === 0) {
      return <OfflineState onRetry={() => search.refetch()} />;
    }
    if (search.isLoading) {
      return (
        <View className="px-5 pt-2">
          <ResultCardSkeleton />
          <ResultCardSkeleton />
        </View>
      );
    }
    if (search.isError && items.length === 0) {
      return <ErrorState onRetry={() => search.refetch()} />;
    }
    return null;
  };

  const placeholder = body();

  return (
    <>
    <BottomSheet
      ref={sheet}
      index={0}
      onChange={(index) => setCollapsed(index === 0)}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      topInset={topInset}
      bottomInset={0}
      enablePanDownToClose={false}
      activeOffsetY={[-12, 12]}
      failOffsetX={[-20, 20]}
      handleComponent={() => (
        <View style={{ paddingHorizontal: 20, height: HANDLE_HEIGHT }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#d6d3d1', alignSelf: 'center', marginTop: 8, marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Toon salons" onPress={() => sheet.current?.snapToIndex(collapsed ? 1 : 0)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.navy }}>Salons <Text style={{ fontSize: 13, fontWeight: '400', color: colors.muted }}>· {items.length}{search.hasNextPage ? '+' : ''}</Text></Text>
            </Pressable>
            {/* hitSlop keeps the 44pt target while the pill itself stays small. */}
            <Pressable accessibilityRole="button" accessibilityLabel={`Filters${filterCount ? `, ${filterCount} actief` : ''}`} onPress={() => setFiltersOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, borderWidth: 1, borderColor: filterCount ? colors.blue : colors.line, borderRadius: 17, paddingHorizontal: 13, backgroundColor: filterCount ? colors.blueTint : '#fff' }}>
              <Ionicons name="options-outline" size={16} color={colors.navy} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.navy }}>Filters{filterCount ? ` (${filterCount})` : ''}</Text>
            </Pressable>
          </View>
        </View>
      )}
      backgroundStyle={{ backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
      {placeholder ?? (
        <BottomSheetFlatList
          data={items}
          keyExtractor={(item) => item.locationId}
          // Keep the sheet flush with the screen; only its content clears the floating tabs.
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabClearance + 28, paddingTop: 0 }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={pullRefresh.refreshing}
              onRefresh={pullRefresh.onRefresh}
            />
          }
          // The count lives in the handle ("Salons · 2").
          ListHeaderComponent={online ? null : <View className="pb-2"><OfflineBanner /></View>}
          ListEmptyComponent={
            <View className="px-2">
              {search.isError ? (
                <ErrorState onRetry={() => search.refetch()} />
              ) : (
                <Text className="py-8 text-center text-base font-semibold text-ink">{t('discover.emptyTitle')}</Text>
              )}
              {!search.isError ? (
                <Text className="text-center text-sm text-muted">{t('discover.emptyBody')}</Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            search.isFetchingNextPage ? (
              <ActivityIndicator color="#071D43" style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={renderItem}
        />
      )}
    </BottomSheet>
    {filtersOpen ? <DiscoveryFilters onClose={() => setFiltersOpen(false)} /> : null}
    </>
  );
}
