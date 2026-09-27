import { usePullRefresh } from '@/src/hooks/use-pull-refresh';
import { brandColors } from '@/src/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import React, { useRef } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { galleryFromItem } from '@/src/api/gallery';
import type { FavoriteSalon, SearchItem } from '@/src/api/types';
import { useImagesReady } from '@/src/hooks/use-images-ready';
import { CarouselParentScrollContext } from '@/src/components/media-carousel';
import { ResultCard } from '@/src/components/result-card';
import { SearchBar } from '@/src/components/expandable-search';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { CategoryGridSkeleton, CompactCardSkeleton } from '@/src/components/skeleton';
import { TopFade } from '@/src/components/top-fade';
import { useCategories, useFavorites, useSearchResults } from '@/src/hooks/use-marketplace';
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
  const favorites = useFavorites();
  const search = useSearchResults();
  const pullRefresh = usePullRefresh(search.refetch);
  const online = useOnline();
  const toggleCategory = useDiscovery((s) => s.toggleCategory);
  const selectedCategoryIds = useDiscovery((s) => s.categoryIds);
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
  const isSelected = (id: string | null) => (id ? selectedCategoryIds.includes(id) : selectedCategoryIds.length === 0);
  const ios = Platform.OS === 'ios';
  return <View className="flex-1 bg-canvas">
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      contentInset={ios ? { top: insets.top } : undefined}
      contentOffset={ios ? { x: 0, y: -insets.top } : undefined}
      scrollIndicatorInsets={ios ? { top: insets.top } : undefined}
      contentContainerStyle={{ paddingTop: ios ? 0 : insets.top, paddingBottom: insets.bottom + 104 }}
      refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} tintColor={brandColors.navy} progressViewOffset={insets.top} />}>
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Zoekgebied wijzigen op de kaart" onPress={() => router.navigate('/discover')} className="min-h-11 flex-row items-center gap-1">
          <Ionicons name="location" size={15} color={brandColors.blue} /><Text className="text-xs font-semibold text-ink">{userLocation ? 'Huidige locatie' : 'Brussel'}</Text><Ionicons name="chevron-down" size={12} color="#071D43" />
        </Pressable>
        <Image source={require('@/assets/gleami-wordmark.svg')} contentFit="contain" accessibilityLabel="Gleami" style={{ width: 96, height: 36 }} />
      </View>
      <SearchBar variant="home" />
      {categories.data ? <Animated.View entering={FADE_IN}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 26, gap: 8 }}>
        {columns.map((column, i) => <View key={i} style={{ gap: 18 }}>{column.map((c) => {
          const selected = isSelected(c.id);
          return <Pressable key={c.id ?? 'all'} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={c.name} onPress={() => toggleCategory(c.id)} style={{ width: 70, alignItems: 'center', gap: 7 }}>
            <View style={{ width: 56, height: 56, borderRadius: 17, borderWidth: selected ? 1.5 : 1, borderColor: selected ? brandColors.blue : brandColors.line, backgroundColor: selected ? brandColors.blueTint : brandColors.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={c.icon} size={25} color={selected ? brandColors.blue : '#071D43'} /></View>
            <Text numberOfLines={2} style={{ height: 30, fontSize: 10, lineHeight: 14, textAlign: 'center', fontWeight: selected ? '600' : '400', color: '#071D43' }}>{c.name}</Text>
          </Pressable>;
        })}</View>)}
      </ScrollView></Animated.View> : categories.isError ? <Pressable accessibilityRole="button" onPress={() => categories.refetch()} className="px-5 py-3"><Text className="text-accent">Categorieën opnieuw laden</Text></Pressable> : <CategoryGridSkeleton />}
      <Animated.View layout={ROW_LAYOUT}><FavoritesRow items={favorites.data ?? []} /></Animated.View>
      {!online && !items.length ? <OfflineState onRetry={() => search.refetch()} /> : search.isLoading || (items.length > 0 && !coversReady) ? <>
        <SalonRowSkeleton title={DISCOVER_TITLE} />
        <SalonRowSkeleton title={NEARBY_TITLE} />
      </> : search.isError && !items.length ? <ErrorState onRetry={() => search.refetch()} /> : items.length ? <Animated.View entering={FADE_IN} layout={ROW_LAYOUT}>
        <SalonRow title={DISCOVER_TITLE} items={discoverItems} />
        <SalonRow title={NEARBY_TITLE} items={nearbyItems} />
      </Animated.View> : <View className="p-6"><Text className="text-xl font-semibold text-ink">Geen salons gevonden</Text>
        {selectedCategoryIds.length
          ? <Pressable accessibilityRole="button" onPress={() => toggleCategory(null)} className="py-4"><Text className="text-accent">Bekijk alle behandelingen</Text></Pressable>
          : <Pressable accessibilityRole="button" onPress={() => router.navigate('/discover')} className="py-4"><Text className="text-accent">Zoek op de kaart</Text></Pressable>}
      </View>}
    </ScrollView>
    <TopFade />
  </View>;
}

const ROW_LAYOUT = LinearTransition.duration(280).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);

const FAVORITES_TITLE = 'Favorieten';
const DISCOVER_TITLE = 'Ontdek jouw volgende salon';
const NEARBY_TITLE = 'Dicht bij jou';
const FADE_IN = FadeIn.duration(320).easing(Easing.out(Easing.cubic));

function RowHeader({ title, onMore = () => router.navigate('/discover') }: { title: string; onMore?: () => void }) {
  return <View className="mb-3 flex-row items-center justify-between gap-2 px-5"><Text className="flex-1 text-xl font-bold tracking-tight text-ink">{title}</Text><Pressable onPress={onMore} accessibilityRole="button" accessibilityLabel={`Bekijk alle salons: ${title}`} className="h-11 w-11 items-center justify-center rounded-full border border-line"><Ionicons name="arrow-forward" size={19} color="#071D43" /></Pressable></View>;
}

/** Only shown to signed-in users with at least one saved salon. */
function FavoritesRow({ items }: { items: FavoriteSalon[] }) {
  if (!items.length) return null;
  return <View className="mb-4 mt-4">
    <RowHeader title={FAVORITES_TITLE} onMore={() => router.push('/favorites')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
      {items.map((item) => {
        const cover = galleryFromItem(item.images, item.imageUrl)[0] ?? null;
        return <Pressable key={item.locationId} accessibilityRole="button" accessibilityLabel={item.name} onPress={() => router.push({ pathname: '/salon/[slug]', params: { slug: item.slug } })} style={{ width: 246 }}>
          {cover ? <Image source={{ uri: cover }} style={{ height: 148, borderRadius: 20 }} contentFit="cover" /> : <View style={{ height: 148, borderRadius: 20, backgroundColor: brandColors.line }} />}
          <Text numberOfLines={1} className="mt-3 text-base font-semibold text-ink">{item.name}</Text>
          {item.city ? <Text numberOfLines={1} className="mt-0.5 text-sm text-muted">{item.city}</Text> : null}
        </Pressable>;
      })}
    </ScrollView>
  </View>;
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
