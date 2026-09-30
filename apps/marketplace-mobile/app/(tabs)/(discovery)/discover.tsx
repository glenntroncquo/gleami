import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/src/components/expandable-search';
import { DiscoverMap } from '@/src/components/discover-map';
import { DiscoverSheet } from '@/src/components/discover-sheet';
import { GlassPill } from '@/src/components/glass';
import { useCategories, useSearchResults } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useDiscovery } from '@/src/store/discovery';

export default function DiscoverScreen() {
  const { expandSearch } = useLocalSearchParams<{ expandSearch?: string }>();
  const openSheet = useLocalSearchParams<{ openSheet?: string }>().openSheet === '1';
  const insets = useSafeAreaInsets();
  const [searchBarHeight, setSearchBarHeight] = useState(58);
  const sheetTopInset = insets.top + 8 + searchBarHeight + 8;
  const q = useDiscovery((state) => state.q);
  const categoryId = useDiscovery((state) => state.categoryIds[0] ?? null);
  const categoryCount = useDiscovery((state) => state.categoryIds.length);
  const locationLabel = useDiscovery((state) => state.locationLabel);
  const initializeDeviceLocation = useDiscovery((state) => state.initializeDeviceLocation);
  const focusResults = useDiscovery((state) => state.focusResults);
  const focusedQuery = useRef('');
  const areaSearchVisible = useDiscovery((state) => state.areaSearchVisible);
  const applyAreaSearch = useDiscovery((state) => state.applyAreaSearch);
  const categories = useCategories();
  const search = useSearchResults();
  const items = useMemo(
    () => search.data?.pages.flatMap((page) => page.items) ?? [],
    [search.data],
  );
  const categoryName = categories.data?.find((category) => category.id === categoryId)?.name;
  const summary = q || (categoryCount > 1 ? `${categoryCount} behandelingen` : categoryName) || 'Alle behandelingen';

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      focusedQuery.current = '';
      return;
    }
    const top = items[0];
    if (!top || focusedQuery.current === trimmed) return;
    focusedQuery.current = trimmed;
    focusResults({ lat: top.lat, lng: top.lng });
  }, [q, items, focusResults]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        await initializeDeviceLocation();
      } catch { /* Keep the Ghent fallback. */ }
    })();
    return () => {
      cancelled = true;
    };
  }, [initializeDeviceLocation]);

  return (
    <View className="flex-1 bg-canvas">
      <DiscoverMap items={items} />
      <View pointerEvents="box-none" className="absolute inset-0">
        <View pointerEvents="box-none" style={{ paddingTop: insets.top + 8 }} className="gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Locatie wijzigen" onPress={() => router.push('/location')} className="mx-5 h-10 flex-row items-center gap-2 self-start rounded-full bg-white/95 px-4 shadow-sm">
            <Ionicons name="location" size={15} color="#6488E8" /><Text className="text-xs font-semibold text-ink">{locationLabel}</Text><Ionicons name="chevron-down" size={12} color="#071D43" />
          </Pressable>
          <View onLayout={(event) => setSearchBarHeight(event.nativeEvent.layout.height)}>
            <SearchBar variant="results" summary={summary} autoExpand={expandSearch === '1'} />
          </View>
        </View>
        {areaSearchVisible ? (
          <View pointerEvents="box-none" className="absolute left-0 right-0 items-center" style={{ top: '36%' }}>
            <Pressable
              onPress={applyAreaSearch}
              accessibilityRole="button"
              accessibilityLabel={t('discover.searchThisArea')}>
              <GlassPill>
                <Text className="text-sm font-semibold text-ink">{t('discover.searchThisArea')}</Text>
              </GlassPill>
            </Pressable>
          </View>
        ) : null}
      </View>
      <DiscoverSheet topInset={sheetTopInset} openInitially={openSheet} />
    </View>
  );
}
