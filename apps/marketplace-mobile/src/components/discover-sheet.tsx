import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SearchItem } from '@/src/api/types';
import { ResultCard } from '@/src/components/result-card';
import { ErrorState, OfflineBanner, OfflineState } from '@/src/components/screen-state';
import { ResultCardSkeleton } from '@/src/components/skeleton';
import { useNextAvailable, useSearchResults } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useOnline } from '@/src/lib/online';

export function DiscoverSheet() {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const search = useSearchResults();
  const items = useMemo(
    () => search.data?.pages.flatMap((page) => page.items) ?? [],
    [search.data],
  );
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: SearchItem }[] }) => {
      const ids = viewableItems.map((entry) => entry.item.locationId).slice(0, 24);
      setVisibleIds(ids);
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

  const pairs = rendered.flatMap((item) => {
    const treatment = item.treatments[0];
    if (!treatment) return [];
    return [
      {
        locationId: item.locationId,
        serviceId: treatment.serviceId,
        serviceVariantId: treatment.serviceVariantId,
      },
    ];
  });
  const availability = useNextAvailable(pairs);
  const renderedIds = new Set(rendered.map((item) => item.locationId));

  const snapPoints = useMemo(() => ['28%', '58%', '92%'], []);

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
    <BottomSheet
      index={1}
      snapPoints={snapPoints}
      bottomInset={insets.bottom + 74}
      enablePanDownToClose={false}
      handleIndicatorStyle={{ backgroundColor: '#d6d3d1', width: 36 }}
      backgroundStyle={{ backgroundColor: '#ffffff', borderRadius: 28 }}>
      {placeholder ?? (
        <BottomSheetFlatList
          data={items}
          keyExtractor={(item) => item.locationId}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 4 }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={search.isRefetching && !search.isFetchingNextPage}
              onRefresh={() => {
                void search.refetch();
              }}
            />
          }
          ListHeaderComponent={
            <View className="pb-3">
              {!online ? <OfflineBanner /> : null}
              <Text className="text-sm text-muted">{t('discover.results', { count: items.length })}</Text>
            </View>
          }
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
              <ActivityIndicator color="#1c1917" style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item }) => {
            const status = availability.data?.results[item.locationId];
            const loading = !status && availability.isFetching && renderedIds.has(item.locationId);
            return <ResultCard item={item} availability={status} availabilityLoading={loading} />;
          }}
        />
      )}
    </BottomSheet>
  );
}
