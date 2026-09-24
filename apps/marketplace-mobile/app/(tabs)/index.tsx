import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryChips } from '@/src/components/category-chips';
import { DiscoverMap } from '@/src/components/discover-map';
import { DiscoverSheet } from '@/src/components/discover-sheet';
import { ExampleBanner } from '@/src/components/example-banner';
import { GlassPill } from '@/src/components/glass';
import { useCategories, useSearchResults } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useDiscovery } from '@/src/store/discovery';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const q = useDiscovery((state) => state.q);
  const categoryId = useDiscovery((state) => state.categoryIds[0] ?? null);
  const setUserLocation = useDiscovery((state) => state.setUserLocation);
  const areaSearchVisible = useDiscovery((state) => state.areaSearchVisible);
  const applyAreaSearch = useDiscovery((state) => state.applyAreaSearch);
  const categories = useCategories();
  const search = useSearchResults();
  const items = search.data?.pages.flatMap((page) => page.items) ?? [];
  const categoryName = categories.data?.find((category) => category.id === categoryId)?.name;
  const summary = q || categoryName || t('discover.searchHint');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled || permission.status !== Location.PermissionStatus.GRANTED) return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch {
        // Permission denied or location unavailable: stay on Brussels.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUserLocation]);

  return (
    <View className="flex-1 bg-canvas">
      <DiscoverMap items={items} />
      <View pointerEvents="box-none" className="absolute inset-0">
        <View pointerEvents="box-none" style={{ paddingTop: insets.top + 8 }} className="gap-3">
          <ExampleBanner />
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel={t('discover.searchPlaceholder')}
            className="mx-5">
            <GlassPill>
              <View className="flex-row items-center gap-3">
                <Ionicons name="search" size={20} color="#1c1917" />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-ink">{t('discover.searchPlaceholder')}</Text>
                  <Text className="text-sm text-muted" numberOfLines={1}>
                    {summary}
                  </Text>
                </View>
              </View>
            </GlassPill>
          </Pressable>
          <CategoryChips />
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
      <DiscoverSheet />
    </View>
  );
}
