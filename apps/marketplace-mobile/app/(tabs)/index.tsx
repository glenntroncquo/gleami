import { brandColors } from '@/src/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import React, { useRef } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { galleryFromItem } from '@/src/api/gallery';
import type { SearchItem } from '@/src/api/types';
import { useImagesReady } from '@/src/hooks/use-images-ready';
import { CarouselParentScrollContext } from '@/src/components/media-carousel';
import { ResultCard } from '@/src/components/result-card';
import { SearchBar } from '@/src/components/expandable-search';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { CategoryGridSkeleton, CompactCardSkeleton } from '@/src/components/skeleton';
import { TopFade } from '@/src/components/top-fade';
import { useCategories, useSearchResults } from '@/src/hooks/use-marketplace';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

function categoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  if (/haar|kapper|keratine/i.test(name)) return 'cut-outline';
  if (/nagel|make-up/i.test(name)) return 'color-palette-outline';
  if (/massage|spa/i.test(name)) return 'leaf-outline';
  if (/wenkbrauw|wimper/i.test(name)) return 'eye-outline';
  if (/gezicht/i.test(name)) return 'happy-outline';
  if (/ontharing/i.test(name)) return 'sparkles-outline';
  return 'flower-outline';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const search = useSearchResults();
  const online = useOnline();
  const setCategory = useDiscovery((s) => s.setCategory);
  const setQuery = useDiscovery((s) => s.setQuery);
  const userLocation = useDiscovery((s) => s.userLocation);
  const items = search.data?.pages.flatMap((page) => page.items) ?? [];
  const discoverItems = items.slice(0, 10);
  const nearbyItems = [...items].filter((item) => item.distanceKm != null).sort((a, b) => a.distanceKm! - b.distanceKm!).slice(0, 10);
  const firstCovers = [...discoverItems.slice(0, 2), ...nearbyItems.slice(0, 2)]
    .map((item) => galleryFromItem(item.images, item.imageUrl)[0])
    .filter((uri): uri is string => Boolean(uri));
  const coversReady = useImagesReady(firstCovers);
  const choices = [{ id: null, name: 'Alle', icon: 'grid-outline' as const }, ...(categories.data ?? []).map((c) => ({ ...c, icon: categoryIcon(c.name) }))];
  const columns = Array.from({ length: Math.ceil(choices.length / 2) }, (_, i) => choices.slice(i * 2, i * 2 + 2));
  const browse = (id: string | null) => { setQuery(''); setCategory(id); router.navigate('/discover'); };
  const ios = Platform.OS === 'ios';
  return <View className="flex-1 bg-canvas">
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      contentInset={ios ? { top: insets.top } : undefined}
      contentOffset={ios ? { x: 0, y: -insets.top } : undefined}
      scrollIndicatorInsets={ios ? { top: insets.top } : undefined}
      contentContainerStyle={{ paddingTop: ios ? 0 : insets.top, paddingBottom: insets.bottom + 104 }}
      refreshControl={<RefreshControl refreshing={search.isRefetching} onRefresh={() => { void search.refetch(); }} tintColor={brandColors.navy} progressViewOffset={insets.top} />}>
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Zoekgebied wijzigen op de kaart" onPress={() => router.navigate('/discover')} className="min-h-11 flex-row items-center gap-1">
          <Ionicons name="location" size={15} color={brandColors.blue} /><Text className="text-xs font-semibold text-ink">{userLocation ? 'Huidige locatie' : 'Brussel'}</Text><Ionicons name="chevron-down" size={12} color="#071D43" />
        </Pressable>
        <Image source={require('@/assets/gleami-wordmark.svg')} contentFit="contain" accessibilityLabel="Gleami" style={{ width: 96, height: 36 }} />
      </View>
      <SearchBar variant="home" />
      {categories.data ? <Animated.View entering={FADE_IN}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 26, gap: 8 }}>
        {columns.map((column, i) => <View key={i} style={{ gap: 18 }}>{column.map((c) => <Pressable key={c.id ?? 'all'} accessibilityRole="button" accessibilityLabel={c.name} onPress={() => browse(c.id)} style={{ width: 70, alignItems: 'center', gap: 7 }}>
          <View style={{ width: 56, height: 56, borderRadius: 17, borderWidth: 1, borderColor: c.id ? brandColors.line : `${brandColors.blue}40`, backgroundColor: c.id ? brandColors.surface : brandColors.blueTint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={c.icon} size={25} color={c.id ? '#071D43' : brandColors.navy} /></View>
          <Text numberOfLines={2} style={{ height: 30, fontSize: 10, lineHeight: 14, textAlign: 'center', color: '#071D43' }}>{c.name}</Text>
        </Pressable>)}</View>)}
      </ScrollView></Animated.View> : categories.isError ? <Pressable accessibilityRole="button" onPress={() => categories.refetch()} className="px-5 py-3"><Text className="text-accent">Categorieën opnieuw laden</Text></Pressable> : <CategoryGridSkeleton />}
      {!online && !items.length ? <OfflineState onRetry={() => search.refetch()} /> : search.isLoading || (items.length > 0 && !coversReady) ? <>
        <SalonRowSkeleton title={DISCOVER_TITLE} />
        <SalonRowSkeleton title={NEARBY_TITLE} />
      </> : search.isError && !items.length ? <ErrorState onRetry={() => search.refetch()} /> : items.length ? <Animated.View entering={FADE_IN}>
        <SalonRow title={DISCOVER_TITLE} items={discoverItems} />
        <SalonRow title={NEARBY_TITLE} items={nearbyItems} />
      </Animated.View> : <View className="p-6"><Text className="text-xl font-semibold text-ink">Geen salons gevonden</Text><Pressable accessibilityRole="button" onPress={() => browse(null)} className="py-4"><Text className="text-accent">Bekijk alle behandelingen</Text></Pressable></View>}
    </ScrollView>
    <TopFade />
  </View>;
}

const DISCOVER_TITLE = 'Ontdek jouw volgende salon';
const NEARBY_TITLE = 'Dicht bij jou';
const FADE_IN = FadeIn.duration(320).easing(Easing.out(Easing.cubic));

function RowHeader({ title }: { title: string }) {
  return <View className="mb-3 flex-row items-center justify-between gap-2 px-5"><Text className="flex-1 text-xl font-bold tracking-tight text-ink">{title}</Text><Pressable onPress={() => router.navigate('/discover')} accessibilityRole="button" accessibilityLabel={`Bekijk alle salons: ${title}`} className="h-11 w-11 items-center justify-center rounded-full border border-line"><Ionicons name="arrow-forward" size={19} color="#071D43" /></Pressable></View>;
}

/** Same header and card geometry as SalonRow, so the swap to real cards doesn't move anything. */
function SalonRowSkeleton({ title }: { title: string }) {
  return <View className="mb-4 mt-4" accessibilityLabel="Salons laden" accessibilityRole="progressbar">
    <RowHeader title={title} />
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 14, overflow: 'hidden' }}>
      <CompactCardSkeleton />
      <CompactCardSkeleton />
    </View>
  </View>;
}

function SalonRow({ title, items }: { title: string; items: SearchItem[] }) {
  const rowRef = useRef<GestureScrollView>(null);
  if (!items.length) return null;
  return <View className="mb-4 mt-4">
    <RowHeader title={title} />
    <CarouselParentScrollContext.Provider value={rowRef}>
      <GestureScrollView ref={rowRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>{items.map((item) => <View key={item.locationId} style={{ width: 246 }}><ResultCard item={item} availabilityLoading={false} compact /></View>)}</GestureScrollView>
    </CarouselParentScrollContext.Provider>
  </View>;
}
